/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "liveenroll00001",
    "created": "2026-04-17 10:00:05.000Z",
    "updated": "2026-04-17 10:00:05.000Z",
    "name": "live_class_enrollments",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "leclass01",
        "name": "live_class",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "liveclass001234",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "lestdnt01",
        "name": "student",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "leenrdt01",
        "name": "enrolled_at",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "lepayst01",
        "name": "payment_status",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "pending",
            "paid",
            "refunded"
          ]
        }
      }
    ],
    "indexes": [
      "CREATE INDEX idx_lce_live_class ON live_class_enrollments (live_class)",
      "CREATE INDEX idx_lce_student ON live_class_enrollments (student)",
      "CREATE UNIQUE INDEX idx_lce_unique ON live_class_enrollments (live_class, student)"
    ],
    "listRule": "@request.auth.id != '' && student = @request.auth.id",
    "viewRule": "@request.auth.id != '' && student = @request.auth.id",
    "createRule": "@request.auth.id != ''",
    "updateRule": null,
    "deleteRule": "@request.auth.id != '' && student = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("liveenroll00001");

  return dao.deleteCollection(collection);
})
