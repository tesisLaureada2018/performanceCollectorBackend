const elasticHost = process.env.ELASTIC_HOST || 'localhost';
const elasticPort = process.env.ELASTIC_PORT || '9200';

const mongoUserName = process.env.USER_NAME || 'unacloud';
const mongoUserPass = process.env.USER_PASS || 'unacloudpass123'


const MongoClient = require('mongodb').MongoClient;
const urlMongo = 'mongodb://'+mongoUserName+':'+mongoUserPass+'@ds255332.mlab.com:55332/performance_collector_unacloud';

const urlElastic = 'http://'+elasticHost+':'+elasticPort;

function connect(urlMongo) {
    return MongoClient.connect(urlMongo, { useNewUrlParser: true }).then(client => client.db('performance_collector_unacloud'))
}
module.exports = async function() {
    let databases = await Promise.all([connect(urlMongo)])
    return {
        performance_collector : databases[0], urlElastic
    }
}
