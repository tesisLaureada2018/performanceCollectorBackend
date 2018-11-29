var axios = require('axios');
var qs = require('qs');
var email = require('./EmailNotification.js');

exports.hardwareInfo = function (req, res) {
    let newMetric = qs.parse(req.body);
    if (!PerformanceDB) {
        res.json({ error: "DB Error" });
        return;
    }
    var collectionP = PerformanceDB.collection('hardwareInfoCollection');
    collectionP.insertOne(newMetric, function (error, result) {
        if (error) { console.log(error); res.json(error); }
        if (result) { res.json("Saved"); }
    });
}
exports.processes = function (req, res) {
    let newMetric = qs.parse(req.body);
    if (!PerformanceDB) {
        res.json({ error: "DB Error" });
        return;
    }
    var collectionP = PerformanceDB.collection('processesCollection');
    collectionP.insertOne(newMetric, function (error, result) {
        if (error) { console.log(error); res.json(error); }
        if (result) { res.json("Saved"); }
    });
}
exports.recoveredData = function (req, res) {
    let newMetric = qs.parse(req.body);
    if (!PerformanceDB) {
        res.json({ error: "DB Error" });
        return;
    }
    var collectionP = PerformanceDB.collection('recoveredDataCollection');
    collectionP.insertOne(newMetric, function (error, result) {
        if (error) { console.log(error); res.json(error); }
        if (result) { res.json("Saved"); }
    });
    alert("noInternetConection. noInternetConection for IP: ", newMetric.ip, newMetric.timestamp, newMetric.timeOffline);
}

exports.createMetric = function (req, res) {
    let newMetric = qs.parse(req.body);
    if (!PerformanceDB) {
        res.json({ error: "DB Error" });
        return;
    }
    //To mongo: The document is saved as it came
    var collectionP = PerformanceDB.collection('MetricsCollection');
    collectionP.insertOne(newMetric, function (error, result) {
        if (error) { console.log(error); res.json(error); }
        if (result) { console.log("Saved"); }
    });

    //to elasticSearch
    let cpu = newMetric.cpu_details;
    cpu.timestamp = newMetric.timestamp;
    cpu.ip = newMetric.ip;
    axios.post(elasticSearch + "/cpu/doc/", cpu).then(
        (res) => {
            console.log("Elastic cpu: " + res.status);
        },
        (err) => {
            setTimeout(function () { retryFailedRequest(elasticSearch + "/cpu/doc/", cpu) }, 10000);
        }
    );
    let memory = newMetric.ram;
    memory.timestamp = newMetric.timestamp;
    memory.ip = newMetric.ip;
    axios.post(elasticSearch + "/memory/doc/", memory).then(
        (res) => {
            console.log("Elastic memory: " + res.status);
        },
        (err) => {
            setTimeout(function () { retryFailedRequest(elasticSearch + "/memory/doc/", memory) }, 10000);
        }
    );
    if (newMetric.rtt) {
        avgRTT = (newMetric.rtt + avgRTT * 99) / 100;
    }
    let unacloudDisk = (newMetric.unacloud_disk ? newMetric.unacloud_disk.percent : -1);
    let summary = {
        ip: newMetric.ip,
        timestamp: newMetric.timestamp,
        cpu_pct: newMetric.cpu,
        ram_pct: newMetric.ram.percent,
        swap_pct: newMetric.swap.percent,
        disk_pct: newMetric.disk.percent,
        unacloudDisk_pct: unacloudDisk,
        net_err_in: newMetric.net_io_counters.errin,
        net_err_out: newMetric.net_io_counters.errout,
        net_drop_in: newMetric.net_io_counters.dropin,
        net_drop_out: newMetric.net_io_counters.dropout,
        running_vms: newMetric.running_vms,
        vms: newMetric.vms,
        virtualbox_status: newMetric.virtualbox_status,
        unacloud_status: newMetric.unacloud_status,
        avgRTT : avgRTT
    };
    axios.post(elasticSearch + "/summary/doc/", summary).then(
        (res) => {
            console.log("Elastic summary: " + res.status);
        },
        (err) => {
            console.log(err);
            setTimeout(function () { retryFailedRequest(elasticSearch + "/summary/doc/", summary) }, 10000);
        }
    );
    res.json(summary);

    if (!machines[newMetric.ip]) {
        machines[newMetric.ip] = {
            lastDate: new Date().getTime(),
            lastMetric: newMetric,

            unacloudIsNotRespondingNotification: false,
            virtualBoxIsNotRespondingNotification: false,
            diskIsFullNotification: false,
            busyNetworkNotification: false,
            shutDownNotification: false,
        }
    }
    machines[newMetric.ip].lastDate = new Date().getTime();
    machines[newMetric.ip].lastMetric = newMetric;

    if (newMetric.unacloud_status === 0) {
        alert("unacloudIsNotResponding. Unacloud is not responding for IP: ", newMetric.ip, newMetric.timestamp);
    }
    if (newMetric.unacloud_status === 1
        && machines[newMetric.ip].unacloudIsNotRespondingNotification) {
        alert("unacloudIsNowResponding. Unacloud is responding again for IP: ", newMetric.ip, newMetric.timestamp);
        machines[newMetric.ip].unacloudIsNotRespondingNotification = false;
    }

    if (newMetric.virtualbox_status === 0) {
        alert("virtualBoxIsNotResponding. VirtualBox is not responding for IP: ", newMetric.ip, newMetric.timestamp);
    }
    if (newMetric.virtualbox_status === 1
        && machines[newMetric.ip].virtualBoxIsNotRespondingNotification) {
        alert("virtualBoxIsNowResponding. VirtualBox is now responding for IP: ", newMetric.ip, newMetric.timestamp);
        machines[newMetric.ip].virtualBoxIsNotRespondingNotification = false;
    }

    if (newMetric.unacloud_disk && newMetric.unacloud_disk.percent >= 80) {
        alert("diskIsFull. diskIsFull IP: ", newMetric.ip, newMetric.timestamp);
    }
    if (newMetric.unacloud_disk && newMetric.unacloud_disk.percent < 80
        && machines[newMetric.ip].diskIsFullNotification) {
        alert("diskHasSpace. diskHasSpace IP: ", newMetric.ip, newMetric.timestamp);
        machines[newMetric.ip].diskIsFullNotification = false;
    }

    if (newMetric.rtt && newMetric.rtt >= (3 * avgRTT)) {
        alert("busyNetwork. busyNetwork IP: ", newMetric.ip, newMetric.timestamp);
    }
    if (newMetric.rtt && newMetric.rtt < (3 * avgRTT)
        && machines[newMetric.ip].busyNetworkNotification) {
        alert("emptyNetwork. emptyNetwork IP: ", newMetric.ip, newMetric.timestamp);
        machines[newMetric.ip].busyNetworkNotification = false;
    }
};

function alert(message, ip, timestamp, timeOffline) {
    let ipM = ip.replace(/\./g, '_');
    var collectionP = PerformanceDB.collection('ErrorsCollection');
    collectionP.find({}).snapshot().forEach(function (test) {
        if (!test.machines[ipM]) {
            test.machines[ipM] = {
                unacloudIsNotResponding: { "count": 0, "hour": [] },
                virtualBoxIsNotResponding: { "count": 0, "hour": [] },
                diskIsFull: { "count": 0, "hour": [] },
                busyNetwork: { "count": 0, "hour": [] },
                shutDown: { "count": 0, "hour": [] },
                noInternetConection: { "count": 0, "hour": [] },
            };
        }

        if (message.startsWith("shutDown")) {
            test.machines[ipM].shutDown["count"] += 1;
            test.shutDown += 1;
            if (!machines[ip].shutDownNotification) {
                test.machines[ipM].shutDown.hour.push(timestamp);
                email.sendEmail(message + ip, 'Fallo: Machine is not responding');
                machines[ip].shutDownNotification = true;
            }
        }
        else if (message.startsWith("isOn")) {
            if (machines[ip].shutDownNotification) {
                email.sendEmail(message + ip, 'Recuperacion: Machine is responding');
                machines[ip].shutDownNotification = false;
            }
        }
        else if (message.startsWith("unacloudIsNotResponding")) {
            test.machines[ipM].unacloudIsNotResponding["count"] += 1;
            test.unacloudIsNotResponding += 1;
            if (!machines[ip].unacloudIsNotRespondingNotification) {
                test.machines[ipM].unacloudIsNotResponding.hour.push(timestamp);
                email.sendEmail(message + ip, 'Fallo: Unacloud is not responding');
                machines[ip].unacloudIsNotRespondingNotification = true;
            }
        }
        else if (message.startsWith("unacloudIsNowResponding")) {
            email.sendEmail(message + ip, 'Recuperacion: Unacloud is now responding');
        }

        else if (message.startsWith("virtualBoxIsNotResponding")) {
            test.machines[ipM].virtualBoxIsNotResponding["count"] += 1;
            test.virtualBoxIsNotResponding += 1;
            if (!machines[ip].virtualBoxIsNotRespondingNotification) {
                test.machines[ipM].virtualBoxIsNotResponding.hour.push(timestamp);
                email.sendEmail(message + ip, 'Fallo: VirtualBox is not responding');
                machines[ip].virtualBoxIsNotRespondingNotification = true;
            }
        }
        else if (message.startsWith("virtualBoxIsNowResponding")) {
            email.sendEmail(message + ip, 'Recuperacion: VirtualBox is now responding');
        }

        else if (message.startsWith("diskIsFull")) {
            test.machines[ipM].diskIsFull["count"] += 1;
            test.diskIsFull += 1;
            if (!machines[ip].diskIsFullNotification) {
                test.machines[ipM].diskIsFull.hour.push(timestamp);
                email.sendEmail(message + ip, 'Fallo: Disk is full');
                machines[ip].diskIsFullNotification = true;
            }
        }
        else if (message.startsWith("diskHasSpace")) {
            email.sendEmail(message + ip, 'Recuperacion: Disk has space');
        }

        else if (message.startsWith("busyNetwork")) {
            test.machines[ipM].busyNetwork["count"] += 1;
            test.busyNetwork += 1;
            if (!machines[ip].busyNetworkNotification) {
                test.machines[ipM].busyNetwork.hour.push(timestamp);
                email.sendEmail(message + ip, 'Fallo: Busy network');
                machines[ip].busyNetworkNotification = true;
            }
        }
        else if (message.startsWith("emptyNetwork")) {
            email.sendEmail(message + ip, 'Recuperacion: Empty Network');
        }

        else if (message.startsWith("noInternetConection")) {
            test.machines[ipM].noInternetConection["count"] += 1;
            test.machines[ipM].noInternetConection.hour.push(timestamp);
            test.noInternetConection += timeOffline;
            email.sendEmail(message + ip, 'Recuperacion: Internet conection re stablished');
        }

        collectionP.save(test);
    });

}

function retryFailedRequest(path, object) {
    axios.post(path, object).then(
        (res) => {
            console.log("Elastic retry failed request: " + res.status);
        },
        (err) => {
            setTimeout(function () { retryFailedRequest(path, object) }, 20000);
        }
    );
}

let avgRTT = 1;
let machines = {};
// 1 min
let frecuency = 1000 * 60;
// 5 min
let timeAccepted = 1000 * 60 * 5;
setTimeout(function () { checkMachines() }, frecuency);
function checkMachines() {
    setTimeout(function () { checkMachines() }, frecuency);
    //console.log(machines);   
    let keys = Object.keys(machines);
    for (let i = 0; i < keys.length; i++) {
        let ip = keys[i];
        let d = new Date();
        let timestamp = [
            (d.getMonth() < 10 ? '0' + d.getMonth() : d.getMonth()) + 1,
            (d.getDate() < 10 ? '0' + d.getDate() : d.getDate()),
            d.getFullYear()].join('-')
            + 'T' +
            [(d.getHours() < 10 ? '0' + d.getHours() : d.getHours()),
            (d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes()),
            (d.getSeconds() < 10 ? '0' + d.getSeconds() : d.getSeconds())].join(':');
        if ((d.getTime() - timeAccepted) > machines[ip].lastDate) {
            alert("shutDown. Machine wont report metrics: Machine has not responded in " + timeAccepted / (1000 * 60) + " minutes IP:", ip, timestamp);
        }
        else {
            alert("isOn. Machine is responding", ip, timestamp);
        }
        const riskCalc = calculateRisk(machines[ip].lastMetric);
        if (riskCalc > 0.5){
            let riskObject = {
                ip: ip,
                timestamp: timestamp,
                risk: riskCalc,
                cpu_pct: machines[ip].lastMetric.cpu,
                ram_pct: machines[ip].lastMetric.ram.percent,
                swap_pct: machines[ip].lastMetric.swap.percent,
                disk_pct: machines[ip].lastMetric.disk.percent,
                unacloudDisk_pct: machines[ip].lastMetric.unacloud_disk.percent,
                running_vms: machines[ip].lastMetric.running_vms,
                vms: machines[ip].lastMetric.vms,
                virtualbox_status: machines[ip].lastMetric.virtualbox_status,
                unacloud_status: machines[ip].lastMetric.unacloud_status
            };
            axios.post(elasticSearch + "/risk/doc/", riskObject).then(
                (res) => {
                    console.log("Elastic risk: " + res.status);
                },
                (err) => {
                    console.log(err);
                    setTimeout(function () { retryFailedRequest(elasticSearch + "/risk/doc/", riskObject) }, 10000);
                }
            );
        }
    }
}

function calculateRisk(machine) {
    //machine is not a valid object
    if (!machine.ip){
        return -1;
    }
    if (machine.unacloud_status === 0 || machine.virtualBoxStatus === 0) {
        return 1;
    }
    const diskRisk = fuzzylogic.trapezoid(machine.unacloudDisk.percent, 20, 90, 100, 101);
    const cpuRisk = fuzzylogic.trapezoid(machine.cpu, 0, 90, 100, 101);
    const ramRisk = fuzzylogic.grade(machine.ram.percent, 0, 100) - 0.3;

    return Math.max(cpuRisk, Math.max(diskRisk, ramRisk));
}

// 3 hours
let frecuencyDet = 1000 * 60 * 60 * 3;
setTimeout(function () { sendDetails() }, 1000 * 10);
function sendDetails() {
    setTimeout(function () { sendDetails() }, frecuencyDet);
    if (!PerformanceDB) {
        return;
    }
    var collection = PerformanceDB.collection('MetricsCollection');
    collection.find({}).toArray(function (err, docs) {
        if (err) console.log(err); //info about what went wrong
        email.sendEmail("there are " + docs.length + " documents in DB", 'Report');
    });
}


exports.readMachines = function (req, res) {
    res.json(machines);
};
exports.readMachineByIp = function (req, res) {
    const ip = req.params.ip;
    res.json(machines[ip]);
}
exports.availableSpaceMachineUnacloudDisk = function (req, res) {
    const ip = req.params.ip;
    res.json({ "availableSpace": machines[ip].lastMetric.unacloud_disk.free });
}
exports.ramPercentMachine = function (req, res) {
    const ip = req.params.ip;
    res.json({ "ram_pct": machines[ip].lastMetric.ram.percent });
}
exports.cpuPercentMachine = function (req, res) {
    const ip = req.params.ip;
    res.json({ "cpu_pct": machines[ip].lastMetric.cpu });
}
exports.virtualBoxStatusMachine = function (req, res) {
    const ip = req.params.ip;
    res.json({ "virtualBoxStatus": machines[ip].lastMetric.virtualbox_status });
}
exports.unacloudStatusMachine = function (req, res) {
    const ip = req.params.ip;
    res.json({ "unacloudStatus": machines[ip].lastMetric.unacloud_status });
}
exports.riskOfMachine = function (req, res) {
    const ip = req.params.ip;
    res.json({ "risk": calculateRisk(machines[ip].lastMetric) });
}
exports.avgRTT = function (req, res) {
    res.json(avgRTT);
};