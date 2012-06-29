var services = {};
var readyCount = 0;

function ready() {
    readyCount++;
    if(readyCount === 2) start();
}

function start() {
    var username = $.cookie("username");
    var password = $.cookie("password");

    $("#loginForm").submit(function(e) {
        e.preventDefault();
        $.cookie("username", $("#loginUsername").val());
        $.cookie("password", $("#loginPassword").val());
        window.location.reload();
    });

    $("#introspectorService").change(function(e) {
        e.preventDefault();
        introspectService(inputValue($(this)));
    });

    $("#rpcService").change(function(e) {
        e.preventDefault();
        rpcService(inputValue($(this)));
    });

    $("#rpcMethod").change(function(e) {
        e.preventDefault();
        rpcMethod(inputValue($("#rpcService")), inputValue($(this)));
    });

    var showLogin = function() {
        transition($("#loading"), $("#login"));
    };

    var showContent = function(permissions) {
        transition($("#loading"), $("#content"));

        var permissionsTable = tmpl("authorizationPermissionsTemplate", {
            permissions: permissions
        });

        $("#authorizationUsername").text(username);
        $("#authorizationPermissions").append($(permissionsTable));

        $(".serviceSelector").append($("<option>"));

        for(var service in client.services) {
            $(".serviceSelector").append($("<option>").text(service));
        }
    };

    var showInitializationError = function(message) {
        transition($("#loading"), $("#initError"));
        $("#initErrorMessage").text(message);
    };

    var loggedIn = function(error, permissions) {
        if(error) {
            if(error.name == "NotAuthenticated") {
                showInitializationError("Authentication failed.");
            } else {
                showInitializationError("Unknown error [" + error.name + "]: " + error.message);
                console.error(error);
            }
        } else {
            var introspectedCount = 0;
            var services = client.services();

            for(var i=0; i<services.length; i++) {
                client.use(services[i], function(error) {
                    if(error) {
                        console.error("Could not use service " + service + ":", error);
                    }

                    introspectedCount++;
                    if(introspectedCount == services.length) showContent(permissions);
                });
            }
        }
    };

    if(username && password) {
        client.login(username, password, loggedIn);
    } else {
        showLogin();
    }
}

var client = new stack.IO("http://localhost:8080", function(error) {
    if(error) {
        console.error(error);
    } else {
        ready();
    }
});

$(ready);