var initDatabases = require('./public/javascripts/DBs.js');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var axios = require('axios');
var cors = require('cors');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json({
    limit: '5mb'
}));
app.use(bodyParser.urlencoded({
    limit: '5mb',
    extended: true,
    parameterLimit: 50
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());

app.get('/', function (req, res, next) {
    res.render('index', {
        title: 'Performance Collector Unacloud'
    });
});

var creator = require('./public/javascripts/Performance/Creators.js');
var deleter = require('./public/javascripts/Performance/Deleters.js');
var reader = require('./public/javascripts/Performance/Readers.js');

initDatabases().then(dbs => {
    console.log("DB Connected Succesfully");
    let PerformanceDB = dbs.performance_collector;
    global.PerformanceDB = PerformanceDB;
    global.elasticSearch = dbs.urlElastic;

    const cpu = {
        "settings": {
            "number_of_shards": 1
        },
        "mappings": {
            "doc": {
                "properties": {
                    "timestamp": {
                        "type": "date",
                        "format": "strict_date_hour_minute_second"
                    },
                    "ip": { "type": "text" },
                    "user": { "type": "float" },
                    "system": { "type": "float" },
                    "idle": { "type": "float" },
                    "interrupt": { "type": "float" },
                    "dcp": { "type": "float" },
                },
            }
        }
    }
    const memory = {
        "settings": {
            "number_of_shards": 1
        },
        "mappings": {
            "doc": {
                "properties": {
                    "timestamp": {
                        "type": "date",
                        "format": "strict_date_hour_minute_second"
                    },
                    "ip": { "type": "text" },
                    "total": { "type": "long" },
                    "available": { "type": "long" },
                    "percent": { "type": "float" },
                    "used": { "type": "long" },
                    "free": { "type": "long" },
                },
            }
        }
    }
    const summary = {
        "settings": {
            "number_of_shards": 1
        },
        "mappings": {
            "doc": {
                "properties": {
                    "cpu_pct": {
                        "type": "float"
                    },
                    "disk_pct": {
                        "type": "float"
                    },
                    "ip": {
                        "type": "text",
                        "fields": {
                            "keyword": {
                                "type": "keyword",
                                "ignore_above": 256
                            }
                        }
                    },
                    "ram_pct": {
                        "type": "float"
                    },
                    "swap_pct": {
                        "type": "float"
                    },
                    "timestamp": {
                        "type": "date",
                        "format": "strict_date_hour_minute_second"
                    },
                    "running_vms": {
                        "type": "short"
                    },
                    "vms": {
                        "type": "short"
                    },
                    "virtualbox_status": {
                        "type": "short"
                    },
                    "unacloud_status": {
                        "type": "short"
                    },
                }
            }
        }
    }

    axios.put(elasticSearch + "/summary", summary).then(
        (res) => { console.log("Elastic summary: " + res.status); },
        (err) => {  }
    );
    axios.put(elasticSearch + "/memory", memory).then(
        (res) => { console.log("Elastic memory: " + res.status); },
        (err) => {  }
    );
    axios.put(elasticSearch + "/cpu", cpu).then(
        (res) => { console.log("Elastic cpu: " + res.status); },
        (err) => {  }
    );
    var collectionP = PerformanceDB.collection('ErrorsCollection');
    let errors = {
        name: "errors",
        unacloudIsNotResponding: 0,
        virtualBoxIsNotResponding: 0,
        diskIsFull: 0,
        busyNetwork: 0,
        shutDown: 0,
        noInternetConection: 0,
        machines : []
    };
    collectionP.find({"name": "errors"}).toArray(function (err, docs) {
        if (docs.length === 0) {
            collectionP.insertOne(errors, function (error, result) {
                if (error) { console.log(error); res.json(error); }
            });
        }
    });
    
}).catch(err => {
    console.error('Failed to make database connection!');
    console.error(err);
});

app.get('/readHardwareInfo', reader.readHardwareInfo);
app.get('/readMetrics', reader.readMetrics);
app.get('/readErrors', reader.readErrors);
app.get('/readrecoveredData', reader.readRecoveredData);
app.get('/readProcesses', reader.readProcesses);

app.get('/readMachines', creator.readMachines);
app.get('/avgRTT', creator.avgRTT);

app.post('/hardwareInfo', creator.hardwareInfo);
app.post('/createMetric', creator.createMetric);
app.post('/recoveredData', creator.recoveredData);
app.post('/processes', creator.processes);

app.post('/deleteMetric', deleter.deleteMetric);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;