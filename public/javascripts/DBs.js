const elasticHost = process.env.ELASTIC_HOST || '157.253.205.39';
const elasticPort = process.env.ELASTIC_PORT || '9200';

const MongoClient = require('mongodb').MongoClient;

const urlMongo = 'mongodb://localhost:27017/performance_collector_unacloud';
const urlElastic = 'http://localhost:9200';

//const urlMongo = 'mongodb://157.253.205.96:27017/performance_collector_unacloud';
//const urlElastic = 'http://'+elasticHost+':'+elasticPort;

function connect(urlMongo) {
    return MongoClient.connect(urlMongo, { useNewUrlParser: true }).then(client => client.db('performance_collector_unacloud'))
}
module.exports = async function() {
    let databases = await Promise.all([connect(urlMongo)])
    return {
        performance_collector : databases[0], urlElastic
    }
}
