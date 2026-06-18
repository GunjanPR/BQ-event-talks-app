# BigQuery Release Notes Explorer 🚀

A sleek, modern web application built using **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that aggregates, filters, and shares BigQuery release notes. 

The application fetches release updates directly from the official Google Cloud Atom feed, partitions multi-update daily releases into single clean cards, displays them on a premium responsive dashboard, and facilitates selective sharing to Twitter/X with a customized compose flow.

---

## 🎯 Features

1. **Granular Feed Parsing & Caching:**
   - Aggregates the official Atom XML feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).
   - Grouping logic splits daily updates into individual items (e.g. separate card entries for `Feature`, `Issue`, `Deprecated`, `Changed`, and `General`).
   - Local JSON-based caching (`feed_cache.json`) preserves data for 1 hour to ensure rapid loading.
   - Interactive manual refresh bypasses cache to poll fresh data immediately.

2. **Premium Visual Styling:**
   - Responsive CSS Grid adapting from mobile single-columns to desktop dual-columns.
   - Distinct, tailormade badge styling and hover borders for different categories (Feature = green, Issue = red, Deprecated = amber).
   - Graceful theme toggle (Dark / Light) with system preference matching, persisting theme states in local storage.
   - Visual skeleton loading screens while fetching data.

3. **Dynamic Filters & Search:**
   - Dynamic extraction of categories to generate interface pill filters.
   - Full-text search across categories, dates, and contents.
   - Real-time statistics counters showing release totals by category.
   - Multi-directional sorting (Newest first / Oldest first).

4. **Selective Twitter/X Integration:**
   - Select-to-Tweet popup draft window.
   - Custom character counter mimicking Twitter/X's official counting specifications (counting any URL as exactly 23 characters).
   - Automated message composition and smart truncation with trailing ellipses (`...`).
   - Integrates with Twitter Web Intent for immediate publishing.

---

## 📂 Project Structure

- `app.py` — Flask backend handling feed ingestion, XML regex grouping, caching, and JSON endpoints.
- `templates/index.html` — Dynamic HTML layout containing filters, search fields, stats, cards, and modal components.
- `static/css/styles.css` — Core responsive styling with color variable custom tokens, hover animations, and light/dark theme rules.
- `static/js/app.js` — Client controller managing fetch, dynamic elements rendering, searches, text copying, and Twitter intent workflows.
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
