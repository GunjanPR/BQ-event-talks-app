import os
import re
import time
import json
import logging
import urllib.parse
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, request

# Initialize Flask app
app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "feed_cache.json"
CACHE_EXPIRY_SECONDS = 3600  # 1 hour cache

def strip_html(html_str):
    """
    Cleans HTML tags to produce a clean plain-text version for tweeting.
    Also handles special formatting and decodes XML entities.
    """
    if not html_str:
        return ""
    
    # Pre-formatting for tweet readability:
    # Replace list items with bullet points or semicolons
    temp = re.sub(r'</li>', '; ', html_str)
    # Replace paragraph closes with space
    temp = re.sub(r'</p>', ' ', temp)
    # Replace line breaks with space
    temp = re.sub(r'<br\s*/?>', ' ', temp)
    # Strip HTML tags
    import html
    text = re.sub(r'<[^>]+>', '', temp)
    text = html.unescape(text)
    
    # Strip double spaces and excess whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fix_relative_links(html_content):
    """
    Ensures that any relative links in the feed's content HTML are resolved to absolute Google Cloud/BigQuery URLs.
    """
    if not html_content:
        return ""
    # Convert href="/..." to href="https://cloud.google.com/..."
    html_content = re.sub(r'href="/', 'href="https://cloud.google.com/', html_content)
    return html_content

def parse_content_html(html_content, date_str, link_url):
    """
    Splits the HTML content of an Atom entry into multiple release note items,
    grouped by their <h3> headers (e.g. Feature, Issue, Deprecated, etc.).
    """
    if not html_content:
        return []
    
    # Use re.split to extract <h3> headers and their subsequent contents.
    # The regex splits on <h3>Category</h3>, keeping the category in the split list.
    parts = re.split(r'<h3[^>]*>(.*?)</h3>', html_content, flags=re.IGNORECASE)
    
    items = []
    
    # First element in the split is everything before the first <h3>.
    # If there is content here, categorize it as "General"
    first_part = parts[0].strip()
    if first_part and len(re.sub(r'<[^>]+>', '', first_part).strip()) > 0:
        cleaned_html = fix_relative_links(first_part)
        items.append({
            'id': f"{date_str.replace(' ', '_')}_general_0",
            'date': date_str,
            'category': 'General',
            'html': cleaned_html,
            'text': strip_html(cleaned_html),
            'link': link_url
        })
        
    # Subsequent elements will be: category, content, category, content, ...
    item_idx = 1
    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            category = parts[i].strip()
            content = parts[i+1].strip()
            if not content or len(re.sub(r'<[^>]+>', '', content).strip()) == 0:
                continue
            
            cleaned_html = fix_relative_links(content)
            items.append({
                'id': f"{date_str.replace(' ', '_')}_{category.lower()}_{item_idx}",
                'date': date_str,
                'category': category,
                'html': cleaned_html,
                'text': strip_html(cleaned_html),
                'link': link_url
            })
            item_idx += 1
            
    return items

def fetch_feed_data():
    """
    Fetches the BigQuery release notes Atom feed and parses it.
    """
    logging.info(f"Fetching fresh release notes from: {FEED_URL}")
    response = requests.get(FEED_URL, timeout=15)
    response.raise_for_status()
    
    # Parse the XML
    root = ET.fromstring(response.content)
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    all_items = []
    
    for entry in root.findall('atom:entry', namespaces):
        title_elem = entry.find('atom:title', namespaces)
        updated_elem = entry.find('atom:updated', namespaces)
        
        # Link elements might have different rel types, look for alternate or fall back
        link_elem = entry.find("atom:link[@rel='alternate']", namespaces)
        if link_elem is None:
            link_elem = entry.find("atom:link", namespaces)
            
        content_elem = entry.find('atom:content', namespaces)
        
        date_str = title_elem.text if title_elem is not None else "Unknown Date"
        updated_str = updated_elem.text if updated_elem is not None else ""
        link_url = link_elem.attrib.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        content_html = content_elem.text if content_elem is not None else ""
        
        # Extract items from this entry's HTML content
        entry_items = parse_content_html(content_html, date_str, link_url)
        all_items.extend(entry_items)
        
    return all_items

def get_release_notes(force_refresh=False):
    """
    Retrieves release notes, utilizing local JSON cache file if valid.
    """
    now = time.time()
    
    # Check if cache is valid and refresh not forced
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                
            cache_time = cache_data.get('timestamp', 0)
            if now - cache_time < CACHE_EXPIRY_SECONDS:
                logging.info("Serving release notes from local cache")
                return cache_data.get('items', [])
        except Exception as e:
            logging.error(f"Error reading cache file: {e}. Re-fetching.")
            
    # Fetch fresh data
    try:
        items = fetch_feed_data()
        
        # Save to cache
        cache_data = {
            'timestamp': now,
            'items': items
        }
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
            
        return items
    except Exception as e:
        logging.error(f"Failed to fetch or parse release notes feed: {e}")
        # If fetch fails, try to fall back to stale cache if available
        if os.path.exists(CACHE_FILE):
            try:
                logging.warning("Fetch failed. Falling back to stale cache.")
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                return cache_data.get('items', [])
            except Exception as cache_err:
                logging.error(f"Failed to read fallback cache: {cache_err}")
        raise e

# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def api_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        items = get_release_notes(force_refresh=force_refresh)
        return jsonify({
            'success': True,
            'items': items,
            'cached_at': os.path.getmtime(CACHE_FILE) if os.path.exists(CACHE_FILE) else time.time()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Run the server on port 5000 in debug mode
    app.run(host='127.0.0.1', port=5000, debug=True)
