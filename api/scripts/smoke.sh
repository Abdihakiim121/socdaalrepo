#!/usr/bin/env bash
# End-to-end check of the main flow against a running API with a freshly seeded database.
# CI runs it on every pull request. To run it yourself: start the API, then
#   API=http://localhost:3000/api ADMIN_PHONE=610000000 ADMIN_PIN=123456 bash scripts/smoke.sh
# It adds a "CI boosteejo" and test buses and users, so use a test database, never a real one.
set -euo pipefail

API="${API:-http://localhost:3000/api}"
PHONE="${ADMIN_PHONE:?set ADMIN_PHONE}"
PIN="${ADMIN_PIN:?set ADMIN_PIN}"
TOKEN=""
STATUS=""
BODY=""

call() { # method path [json-body]
  local method=$1 path=$2 body=${3:-}
  local args=(-sS -X "$method" -H "Content-Type: application/json" -w $'\n%{http_code}')
  if [[ -n "$TOKEN" ]]; then args+=(-H "Authorization: Bearer $TOKEN"); fi
  if [[ -n "$body" ]]; then args+=(-d "$body"); fi
  local out
  out=$(curl "${args[@]}" "$API$path")
  STATUS=$(tail -n1 <<<"$out")
  BODY=$(sed '$d' <<<"$out")
}

expect() { # status description
  if [[ "$STATUS" != "$1" ]]; then
    echo "FAIL  $2: expected HTTP $1, got $STATUS"
    echo "      $BODY"
    exit 1
  fi
  echo "ok    $2"
}

check() { # condition-result description
  if [[ "$1" != "true" ]]; then
    echo "FAIL  $2"
    echo "      $BODY"
    exit 1
  fi
  echo "ok    $2"
}

json() { jq -r "$1" <<<"$BODY"; }

# --- Sign in --------------------------------------------------------------
call GET /health;                                         expect 200 "health check reaches the database"
call POST /auth/login "{\"phone\":\"$PHONE\",\"pin\":\"$PIN\"}"; expect 200 "admin signs in"
TOKEN=$(json .token)
ADMIN_TOKEN=$TOKEN

# --- Boosteejo, route, buses ---------------------------------------------
call GET /cities;                                         expect 200 "list cities"
MOG=$(json '.[] | select(.name=="Mogadishu") | .id')
KIS=$(json '.[] | select(.name=="Kismaayo") | .id')
check "$([[ -n $MOG && -n $KIS ]] && echo true)" "seeded cities include Mogadishu and Kismaayo"

call POST /stations "{\"cityId\":$MOG,\"name\":\"CI boosteejo\",\"district\":\"Hodan\"}"; expect 201 "add a boosteejo"
ST=$(json .id)
call POST /stations/$ST/routes "{\"destinationCityId\":$KIS}"; expect 201 "add a route to Kismaayo"
RT=$(json .id)
call POST /stations/$ST/routes "{\"destinationCityId\":$KIS}"; expect 409 "the same route can't be added twice"

call POST /buses '{"plate":"ci  0001","seatCount":2,"type":"Test"}'; expect 201 "add a 2-seat bus"
BUS1=$(json .id)
check "$([[ $(json .plate) == 'CI 0001' ]] && echo true)" "plate is stored in capitals with single spaces"
call POST /buses '{"plate":"CI 0002","seatCount":14}';  expect 201 "add a 14-seat bus"
BUS2=$(json .id)

# --- Queue ------------------------------------------------------------------
call POST /trips "{\"routeId\":$RT,\"busId\":$BUS1,\"driverName\":\"Abdi\"}"; expect 201 "first bus joins the queue"
T1=$(json .id)
check "$([[ $(json .status) == boarding && $(json .queuePosition) == 1 ]] && echo true)" "first bus is #1 and boarding"
call POST /trips "{\"routeId\":$RT,\"busId\":$BUS1}"; expect 409 "the same bus can't queue twice"
call POST /trips "{\"routeId\":$RT,\"busId\":$BUS2}"; expect 201 "second bus joins the queue"
T2=$(json .id)
check "$([[ $(json .status) == waiting && $(json .queuePosition) == 2 ]] && echo true)" "second bus is #2 and waiting"

# --- Passengers ---------------------------------------------------------------
call POST /trips/$T1/passengers '{"name":"Amina Ali","phone":"+252 61 234 5678","seats":2}'; expect 201 "register a passenger for 2 seats"
check "$([[ $(json .phone) == 612345678 ]] && echo true)" "phone is stored without +252"
call POST /trips/$T1/passengers '{"name":"Too Late","phone":"615550000","seats":1}'; expect 400 "a full bus refuses more passengers"
call GET "/passengers?q=612345678";                        expect 200 "find a passenger by phone"
check "$([[ $(json length) -ge 1 ]] && echo true)" "the passenger is found"
call GET /passengers;                                      expect 200 "list today's passengers"
check "$([[ $(json length) -ge 1 ]] && echo true)" "today's list includes the passenger"

# --- Reorder and depart -------------------------------------------------------
call POST /trips/$T2/move '{"direction":"up"}';           expect 200 "move the second bus up"
check "$([[ $(json '.trips[0].id') == "$T2" && $(json '.trips[0].status') == boarding ]] && echo true)" "the moved bus is now first and boarding"
call POST /trips/$T2/depart;                               expect 200 "mark the first bus departed"
check "$([[ $(json .status) == departed ]] && echo true)" "the trip is departed"
call POST /trips/$T2/depart;                               expect 400 "a bus can't depart twice"
call GET /routes/$RT/queue;                                expect 200 "read the queue"
check "$([[ $(json '.trips | length') == 1 && $(json '.trips[0].id') == "$T1" && $(json '.trips[0].status') == boarding ]] && echo true)" "the next bus moved up and is boarding"
call GET /stations/$ST/today;                              expect 200 "today's numbers"
check "$([[ $(json .totals.departedToday) == 1 && $(json .totals.passengersToday) == 2 ]] && echo true)" "today counts 1 departure and 2 passengers"

# --- Managers ----------------------------------------------------------------
call POST /users "{\"name\":\"CI Manager\",\"phone\":\"619990001\",\"pin\":\"1234\",\"role\":\"manager\",\"stationId\":$ST}"; expect 400 "a 4-digit PIN is refused for new users"
call POST /users "{\"name\":\"CI Manager\",\"phone\":\"619990001\",\"pin\":\"246810\",\"role\":\"manager\",\"stationId\":$ST}"; expect 201 "add a manager"
MGR=$(json .id)

TOKEN=""
call POST /auth/login '{"phone":"619990001","pin":"246810"}'; expect 200 "the manager signs in"
TOKEN=$(json .token)
MGR_TOKEN=$TOKEN
call GET /routes/$RT/queue;                                expect 200 "the manager sees their boosteejo's queue"
call GET /users;                                           expect 403 "a manager can't manage users"

TOKEN=$ADMIN_TOKEN
ADMIN_ID=$(curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" "$API/auth/me" | jq .id)
call PATCH /users/$ADMIN_ID '{"active":false}';           expect 400 "an admin can't block their own account"
call PATCH /users/$MGR '{"active":false}';                 expect 200 "block the manager"
TOKEN=$MGR_TOKEN
call GET /cities;                                          expect 401 "the blocked manager is signed out at once"

# --- PIN guessing -------------------------------------------------------------
TOKEN=""
for i in 1 2 3 4 5; do
  call POST /auth/login '{"phone":"618880000","pin":"000000"}'
  [[ "$STATUS" == 401 ]] || { echo "FAIL  wrong PIN $i: expected 401, got $STATUS"; exit 1; }
done
echo "ok    five wrong PINs are refused"
call POST /auth/login '{"phone":"618880000","pin":"000000"}'; expect 429 "the sixth try is blocked for a while"

echo
echo "All checks passed."
