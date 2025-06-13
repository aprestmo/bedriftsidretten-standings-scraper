import json
from collections import defaultdict
import os

with open("public/played-matches.json", "r", encoding="utf-8") as f:
    matches = json.load(f)

with open("public/standings.json", "r", encoding="utf-8") as f:
    standings = json.load(f)

# Calculate goals
team_stats = defaultdict(lambda: {"scored": 0, "conceded": 0})

for match in matches:
    home, away = match["homeTeam"], match["awayTeam"]
    home_goals, away_goals = map(int, match["score"].split("-"))
    team_stats[home]["scored"] += home_goals
    team_stats[home]["conceded"] += away_goals
    team_stats[away]["scored"] += away_goals
    team_stats[away]["conceded"] += home_goals

# Merge into standings
for team in standings:
    name = team["team"]
    team["goalsScored"] = team_stats[name]["scored"]
    team["goalsConceded"] = team_stats[name]["conceded"]

# Ensure public folder exists
os.makedirs("public", exist_ok=True)
with open("public/standings.json", "w", encoding="utf-8") as f:
    json.dump(standings, f, indent=2, ensure_ascii=False)
