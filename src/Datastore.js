// [START build_service]
// By default, the client will authenticate using the service account file
// specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable and use
// the project specified by the GCLOUD_PROJECT environment variable. See
// https://googlecloudplatform.github.io/google-cloud-node/#/docs/datastore/latest/guides/authentication
// Some basic instructions how how to use the datastore
// https://cloud.google.com/datastore/docs/concepts/entities#datastore-basic-entity-nodejs
import GcpDatastore from '@google-cloud/datastore'

// Instantiates a client
const datastore = GcpDatastore();
// [END build_service]

export const EntityTypes = {
    PROFILE: 'Profile'
}

export default class Datastore {

    static save(type, entity, key) {
        const entityKey = key ? datastore.key([type, key]) : datastore.key(type);
        const entityToStore = { key: entityKey, data: entity };

        return datastore.upsert(entityToStore)
            .then(() => {
                console.log(`${type} ${JSON.stringify(entityToStore.key)} created successfully.`);
                return entityKey;
            })
    }

    static retrieve(type, key) {
        const entityKey = datastore.key([type, key]);
        return datastore.get(entityKey)
            .then(results => {
                const entity = results[0];
                return entity;
            });
    };

    static delete(type, key) {

    }

}