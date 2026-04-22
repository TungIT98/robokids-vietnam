/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "ejbxc49igpaa2qn",
    "created": "2026-04-15 01:48:25.594Z",
    "updated": "2026-04-15 01:48:25.594Z",
    "name": "profiles_test",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "eou0s35w",
        "name": "email",
        "type": "email",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "exceptDomains": null,
          "onlyDomains": null
        }
      },
      {
        "system": false,
        "id": "vnpvkwat",
        "name": "username",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("ejbxc49igpaa2qn");

  return dao.deleteCollection(collection);
})
