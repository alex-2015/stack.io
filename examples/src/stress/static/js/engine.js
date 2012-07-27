// Open Source Initiative OSI - The MIT License (MIT):Licensing
//
// The MIT License (MIT)
// Copyright (c) 2012 DotCloud Inc (opensource@dotcloud.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

var ITEMS_IN_SERIES = 100;
var UPDATE_RATE = 1000;
var metrics = {};

$(function() {
    $("#initializer").submit(function(e) {
        e.preventDefault();
        hideError();

        var workers = parseInt($("#num-workers").val());

        if(isNaN(workers)) {
            return showError("Input Error", "Workers value must be an integer");
        }

        $("#initializer").hide();
        initStress(workers);
    });

    setInterval(function() {
        var total = 0;
        for(var key in metrics) total += metrics[key];
        $("#throughput").text(total);
    }, UPDATE_RATE);
});

function showError(header, message) {
    $("#error").empty().html("<strong>" + header + ":</strong> " + message).show();
}

function hideError() {
    $("#error").hide();
}

function stressRunner(workerNumber, series, service, numWorkers) {
    var count = 0;
    var hasError = false;

    service.lazyIter(function(error, res) {
        if(error) {
            console.error(error);
            hasError = true;
        }

        count++;
    });

    setInterval(function() {
        var x = new Date().getTime();
        var y = hasError ? 0 : count;
        series.addPoint([x, y], true, true);
        metrics[workerNumber] = count;
        count = 0;
    }, UPDATE_RATE);
}

function emptySeries(baseTime, size) {
    var series = [];
    
    for(var i=-(size-1); i<=0; i++) {
        series.push({
            x: baseTime + i * 1000,
            y: 0
        });
    }

    return series;
}

function runStress(service, numWorkers) {
    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });

    var baseTime = new Date().getTime();
    var initialSeries = [];

    for(var i=1; i<=numWorkers; i++) {
        initialSeries.push({
            name: "Performance for worker #" + i,
            data: emptySeries(baseTime, ITEMS_IN_SERIES)
        });
    }

    var chart = new Highcharts.Chart({
        chart: {
            renderTo: 'charts',
            type: 'spline',
            marginRight: 10,

            events: {
                load: function() {
                    for(var i=0; i<numWorkers; i++) {
                        stressRunner(i, this.series[i], service);
                    }
                }
            }
        },

        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150
        },

        yAxis: {
            title: { text: 'Value' },
            plotLines: [{ value: 0, width: 1, color: '#808080' }]
        },

        tooltip: {
            formatter: function() {
                return '<b>'+ this.series.name +'</b><br/>' +
                    Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) +'<br/>' +
                    Highcharts.numberFormat(this.y, 2);
            }
        },

        legend: { enabled: false },
        exporting: { enabled: false },
        series: initialSeries
    });
}

function initStress(numWorkers) {
    stack.io({host: "http://" + window.location.hostname + ":8080", timeout: 5}, function(error, client) {
        if(error) {
            showError("RPC Initialization Error", error.message);
        } else {
            client.login("demo", "demo-password", function(error) {
                if(error) {
                    showError("RPC Login Error", error.message);
                } else {
                    client.use("stress", function(error, service) {
                        if(error) {
                            showError("RPC Error", error.message);
                        } else {
                            runStress(service, numWorkers);
                        }
                    });
                }
            });
        }
    });
}