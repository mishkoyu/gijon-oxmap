name: Update Pollution Data

on:
  schedule:
    # Runs every day at 9:00 AM UTC (10:00 AM Spain time in winter, 11:00 AM in summer)
    - cron: '0 9 * * *'
  workflow_dispatch: # Allows manual triggering from GitHub Actions tab

jobs:
  update-data:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Download and convert pollution data
        run: |
          python scripts/update-pollution.py
      
      - name: Commit and push if changed
        run: |
          git config --global user.name 'GitHub Actions Bot'
          git config --global user.email 'actions@github.com'
          git add data/pollution.geojson
          git diff --quiet && git diff --staged --quiet || (git commit -m "Auto-update pollution data - $(date +'%Y-%m-%d %H:%M')" && git push)

