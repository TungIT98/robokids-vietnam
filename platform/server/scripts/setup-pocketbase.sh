#!/bin/bash
# RoboKids Vietnam - PocketBase Setup Script
# Creates all collections via REST API

set -e

POCKETBASE_URL="${POCKETBASE_URL:-http://127.0.0.1:8090}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@robokids.vn}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123456}"

echo "=== RoboKids Vietnam PocketBase Setup ==="
echo "URL: $POCKETBASE_URL"

# Wait for PocketBase
until curl -s "$POCKETBASE_URL/api/health" > /dev/null 2>&1; do
  echo "Waiting for PocketBase..."
  sleep 1
done

# Authenticate
echo "Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST "$POCKETBASE_URL/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "Failed to authenticate"
  echo "$AUTH_RESPONSE"
  exit 1
fi
echo "Authenticated successfully"

# Helper function
create_collection() {
  local name="$1"
  local type="$2"
  local schema="$3"

  # Check if collection exists
  if curl -s -f "$POCKETBASE_URL/api/collections/$name" -H "Authorization: $TOKEN" > /dev/null 2>&1; then
    echo "  Collection '$name' already exists - skipping"
    return 0
  fi

  echo "  Creating '$name'..."
  local response=$(curl -s -X POST "$POCKETBASE_URL/api/collections" \
    -H "Content-Type: application/json" \
    -H "Authorization: $TOKEN" \
    -d "{\"name\":\"$name\",\"type\":\"$type\",\"schema\":$schema}")

  if echo "$response" | grep -q '"id"'; then
    echo "    Created '$name' successfully"
    return 0
  else
    echo "    Failed: $(echo "$response" | head -c 300)"
    return 1
  fi
}

echo ""
echo "Creating collections..."

# Get profiles collection ID for relation references
PROFILES_ID=$(curl -s "http://127.0.0.1:8090/api/collections/profiles" -H "Authorization: $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
BADGES_ID=$(curl -s "http://127.0.0.1:8090/api/collections/badges" -H "Authorization: $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
COURSES_ID=$(curl -s "http://127.0.0.1:8090/api/collections/courses" -H "Authorization: $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
LESSONS_ID=""
MISSIONS_ID=""
PARENTS_ID=""

echo "Profiles ID: $PROFILES_ID"
echo "Badges ID: $BADGES_ID"
echo "Courses ID: $COURSES_ID"

# 1. user_progress
create_collection "user_progress" "base" "[
  {\"name\": \"user_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$PROFILES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"xp\", \"type\": \"number\"},
  {\"name\": \"level\", \"type\": \"number\"},
  {\"name\": \"streak\", \"type\": \"number\"},
  {\"name\": \"last_activity\", \"type\": \"date\"},
  {\"name\": \"total_lessons_completed\", \"type\": \"number\"},
  {\"name\": \"total_missions_completed\", \"type\": \"number\"}
]"

# 2. badges (already created above)
echo "  Collection 'badges' already exists - skipping"

# 3. courses (already created above)
echo "  Collection 'courses' already exists - skipping"

# 4. lessons
create_collection "lessons" "base" "[
  {\"name\": \"course_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$COURSES_ID\", \"maxSelect\": 1}},
  {\"name\": \"title\", \"type\": \"text\", \"required\": true},
  {\"name\": \"description\", \"type\": \"text\"},
  {\"name\": \"content\", \"type\": \"text\"},
  {\"name\": \"order\", \"type\": \"number\"},
  {\"name\": \"xp_reward\", \"type\": \"number\"},
  {\"name\": \"blockly_xml\", \"type\": \"text\"},
  {\"name\": \"simulator_config\", \"type\": \"json\", \"options\": {\"maxSize\": 2000000}}
]"

# Get lessons ID
LESSONS_ID=$(curl -s "http://127.0.0.1:8090/api/collections/lessons" -H "Authorization: $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Lessons ID: $LESSONS_ID"

# 5. missions
create_collection "missions" "base" "[
  {\"name\": \"title\", \"type\": \"text\", \"required\": true},
  {\"name\": \"description\", \"type\": \"text\"},
  {\"name\": \"difficulty\", \"type\": \"select\", \"options\": {\"values\": [\"easy\", \"medium\", \"hard\", \"expert\"], \"maxSelect\": 1}},
  {\"name\": \"xp_reward\", \"type\": \"number\"},
  {\"name\": \"test_cases\", \"type\": \"json\", \"options\": {\"maxSize\": 2000000}},
  {\"name\": \"starting_code\", \"type\": \"text\"}
]"

# Get missions ID
MISSIONS_ID=$(curl -s "http://127.0.0.1:8090/api/collections/missions" -H "Authorization: $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Missions ID: $MISSIONS_ID"

# 6. completed_lessons
create_collection "completed_lessons" "base" "[
  {\"name\": \"user_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$PROFILES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"lesson_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$LESSONS_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"completed_at\", \"type\": \"date\"},
  {\"name\": \"score\", \"type\": \"number\"}
]"

# 7. mission_attempts
create_collection "mission_attempts" "base" "[
  {\"name\": \"user_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$PROFILES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"mission_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$MISSIONS_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"submitted_code\", \"type\": \"text\"},
  {\"name\": \"passed\", \"type\": \"bool\"},
  {\"name\": \"score\", \"type\": \"number\"},
  {\"name\": \"submitted_at\", \"type\": \"date\"},
  {\"name\": \"execution_time_ms\", \"type\": \"number\"}
]"

# 8. earned_badges
create_collection "earned_badges" "base" "[
  {\"name\": \"user_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$PROFILES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"badge_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$BADGES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"earned_at\", \"type\": \"date\"}
]"

# 9. enrollments
create_collection "enrollments" "base" "[
  {\"name\": \"user_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$PROFILES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"course_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$COURSES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"status\", \"type\": \"select\", \"options\": {\"values\": [\"active\", \"completed\", \"cancelled\"], \"maxSelect\": 1}},
  {\"name\": \"enrolled_at\", \"type\": \"date\"},
  {\"name\": \"expires_at\", \"type\": \"date\"}
]"

# 10. parents (auth collection)
create_collection "parents" "auth" "[
  {\"name\": \"name\", \"type\": \"text\", \"required\": true},
  {\"name\": \"phone\", \"type\": \"text\"},
  {\"name\": \"zalo_id\", \"type\": \"text\"}
]"

# Get parents ID
PARENTS_ID=$(curl -s "http://127.0.0.1:8090/api/collections/parents" -H "Authorization: $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Parents ID: $PARENTS_ID"

# 11. students (auth collection)
create_collection "students" "auth" "[
  {\"name\": \"student_name\", \"type\": \"text\", \"required\": true},
  {\"name\": \"age\", \"type\": \"number\"},
  {\"name\": \"parent_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$PARENTS_ID\", \"maxSelect\": 1}},
  {\"name\": \"avatar_url\", \"type\": \"url\"}
]"

# 12. teachers (auth collection) - use different field names to avoid reserved names
create_collection "teachers" "auth" "[
  {\"name\": \"teacher_name\", \"type\": \"text\", \"required\": true},
  {\"name\": \"teacher_email\", \"type\": \"email\"},
  {\"name\": \"bio\", \"type\": \"text\"},
  {\"name\": \"avatar_url\", \"type\": \"url\"}
]"

# 13. schools
echo "  Collection 'schools' already exists - skipping"

# 14. robot_sessions
create_collection "robot_sessions" "base" "[
  {\"name\": \"user_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$PROFILES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"robot_id\", \"type\": \"text\"},
  {\"name\": \"connection_type\", \"type\": \"select\", \"options\": {\"values\": [\"cloud\", \"lan\", \"ble\"], \"maxSelect\": 1}},
  {\"name\": \"started_at\", \"type\": \"date\"},
  {\"name\": \"ended_at\", \"type\": \"date\"}
]"

# 15. certificates
create_collection "certificates" "base" "[
  {\"name\": \"user_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$PROFILES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"course_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$COURSES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"issued_at\", \"type\": \"date\"},
  {\"name\": \"certificate_url\", \"type\": \"url\"}
]"

# 16. payments
create_collection "payments" "base" "[
  {\"name\": \"user_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$PROFILES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"amount\", \"type\": \"number\"},
  {\"name\": \"currency\", \"type\": \"text\"},
  {\"name\": \"status\", \"type\": \"select\", \"options\": {\"values\": [\"pending\", \"completed\", \"failed\", \"refunded\"], \"maxSelect\": 1}},
  {\"name\": \"payment_method\", \"type\": \"text\"},
  {\"name\": \"transaction_id\", \"type\": \"text\"},
  {\"name\": \"paid_at\", \"type\": \"date\"}
]"

# 17. ghost_leaderboard
create_collection "ghost_leaderboard" "base" "[
  {\"name\": \"mission_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$MISSIONS_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"user_id\", \"type\": \"relation\", \"options\": {\"collectionId\": \"$PROFILES_ID\", \"maxSelect\": 1}, \"required\": true},
  {\"name\": \"completion_time_ms\", \"type\": \"number\"},
  {\"name\": \"recorded_at\", \"type\": \"date\"},
  {\"name\": \"ghost_data\", \"type\": \"text\"}
]"

echo ""
echo "=== Setup Complete ==="
echo "Admin UI: $POCKETBASE_URL/_/"

# List all collections
echo ""
echo "Collections created:"
curl -s "$POCKETBASE_URL/api/collections" -H "Authorization: $TOKEN" | grep -o '"name":"[^"]*"' | while read name; do
  echo "  - $name"
done
