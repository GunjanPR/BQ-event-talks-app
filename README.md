# BigQuery Release Notes Explorer 🚀

A sleek, modern web application built using **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that aggregates, filters, and shares BigQuery release notes. 

The application fetches release updates directly from the official Google Cloud Atom feed, partitions multi-update daily releases into single clean cards, displays them on a premium responsive dashboard, and facilitates selective sharing to Twitter/X with a customized compose flow.

---

## 🎯 Features

1. **Granular Feed Ingestion & Caching:**
   - Aggregates the official Atom XML feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).
   - Grouping logic splits daily updates into individual items (e.g. separate card entries for `Feature`, `Issue`, `Deprecated`, `Changed`, and `General`).
   - Local JSON-based caching (`feed_cache.json`) preserves data for 1 hour to ensure rapid loading.
   - Interactive manual refresh bypasses cache to poll fresh data immediately.
   - **Offline Safeguard Banner:** If a remote network fetch fails, the app displays a warning banner (e.g. *Offline: serving cached release notes from 7:03 PM*) and lets you continue browsing cached data.

2. **Premium Visual Styling & UX Details:**
   - Responsive CSS Grid adapting from mobile single-columns to desktop dual-columns.
   - Distinct, tailormade badge styling and hover borders for different categories (Feature = green, Issue = red, Deprecated = amber).
   - **Theme Toggle Switch:** A sliding toggle switch in the header with moving sun/moon icons to toggle between Dark / Light modes, saving state in local storage.
   - **Collapsible Notes:** Automatically folds cards with descriptions longer than 250 characters and adds a **"Read More" / "Read Less"** height toggle with bottom gradients to maintain layout symmetry.
   - **Relative Dates:** Date badges show relative timestamps (e.g. *Yesterday*, *3 days ago*, *Today*) alongside raw dates.
   - Visual skeleton loading screens while fetching data.

3. **Dynamic Filters, Search & Navigation:**
   - Dynamic extraction of categories to generate interface pill filters.
   - Full-text search across categories, dates, and contents.
   - **Search Highlight Matches:** Search keyword occurrences are highlighted with subtle translucent golden markers (`<mark>`).
   - **Keyboard Shortcut:** Pressing the `/` key instantly focuses your cursor onto the search input.
   - Real-time statistics counters showing release totals by category.
   - Multi-directional sorting (Newest first / Oldest first).

4. **Utilities & Social Integrations:**
   - **Copy Note (Per Card):** A copy button on each card formats and copies the plain text representation to your clipboard.
   - **Export to CSV:** Exports currently filtered release notes directly to a CSV spreadsheet with custom category and timestamped filenames.
   - **Non-blocking Toast Popups:** Subtle slide-in confirmation toasts replace standard alerts for all copy and export actions.
   - **Select-to-Tweet Modal:** When clicking "Tweet", a detailed composer modal displays.
   - **Auto-fit Compose Text:** If your edits exceed X's 280-character limit, clicking the **"Auto-fit Draft"** button trims description text while retaining headings and links.
   - **Twitter Intent:** Integrates with the official web intent popups for immediate publishing.

---

## 📂 Project Structure

- `app.py` — Flask backend handling feed ingestion, XML regex grouping, caching, and JSON endpoints.
- `templates/index.html` — Dynamic HTML layout containing filters, search fields, stats, cards, stale alert banner, and modal components.
- `static/css/styles.css` — Core responsive styling with color variable custom tokens, hover animations, light/dark theme rules, toast slide-ins, and scrollbars.
- `static/js/app.js` — Client controller managing fetch, dynamic elements rendering, searches, text copying, keyboard shortcuts, auto-fit, and Twitter intent workflows.
- `feed_cache.json` — Local temporary JSON data store (ignored by `.gitignore`).

---

## 🛠️ Setup and Installation

### Prerequisites
- Python 3.10+
- Git

### 1. Clone & Navigate
```bash
git clone https://github.com/GunjanPR/BQ-event-talks-app.git
cd BQ-event-talks-app
```

### 2. Configure Virtual Environment & Install Dependencies
Create a virtual environment and install dependencies:

**On Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install Flask requests
```

**On macOS / Linux:**
```bash
python -m venv .venv
source .venv/bin/activate
pip install Flask requests
```

### 3. Run the Server
Launch the Flask development server:
```bash
python app.py
```
Open **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)** in your web browser.

---

## 📄 License
This project is open-source and available under the MIT License.
