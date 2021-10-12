require('cross-fetch/polyfill');
var AmazonCognitoIdentity = require('amazon-cognito-identity-js');
var CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
var AuthenticationDetails = AmazonCognitoIdentity.AuthenticationDetails
var CognitoUser = AmazonCognitoIdentity.CognitoUser

var args = process.argv.slice(2);
var res = "";
var callbackCount = 0;

for (let id = 1; id < 101; id++) {
const authenticationData = {
    Username: "usr" + id,
    Password: "password"
};
const authenticationDetails = new AuthenticationDetails(authenticationData);
var poolData = {
    UserPoolId: args[0],
    ClientId: args[1],
};
const userPool = new CognitoUserPool(poolData);
const userData = {
    Username: "usr"+id,
    Pool: userPool
};
const cognitoUser = new CognitoUser(userData);
pausecomp(Math.floor(Math.random() * 5000) + 0);
cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function(result) {
        var accessToken = result.getAccessToken().getJwtToken();
            res = res.concat("\"", accessToken, "\", ");
            callbackCount++;
    },

    onFailure: function(err) {
		pausecomp(Math.floor(Math.random() * 1000) + 0);
        cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function(result) {
            var accessToken = result.getAccessToken().getJwtToken();
            res = res.concat("\"", accessToken, "\", ");
            callbackCount++;
       },

       onFailure: function(err) {
			pausecomp(Math.floor(Math.random() * 1000) + 0);
           cognitoUser.authenticateUser(authenticationDetails, {
               onSuccess: function(result) {
                   var accessToken = result.getAccessToken().getJwtToken();
                   res = res.concat("\"", accessToken, "\", ");
                   callbackCount++;
               },

               onFailure: function(err) {
					pausecomp(Math.floor(Math.random() * 1000) + 0);
				   cognitoUser.authenticateUser(authenticationDetails, {
					   onSuccess: function(result) {
						   var accessToken = result.getAccessToken().getJwtToken();
						   res = res.concat("\"", accessToken, "\", ");
						   callbackCount++;
					   },

					   onFailure: function(err) {
							pausecomp(Math.floor(Math.random() * 1000) + 0);
						   cognitoUser.authenticateUser(authenticationDetails, {
							   onSuccess: function(result) {
								   var accessToken = result.getAccessToken().getJwtToken();
								   res = res.concat("\"", accessToken, "\", ");
								   callbackCount++;
							   },

							   onFailure: function(err) {
									pausecomp(Math.floor(Math.random() * 1000) + 0);
								   cognitoUser.authenticateUser(authenticationDetails, {
									   onSuccess: function(result) {
										   var accessToken = result.getAccessToken().getJwtToken();
										   res = res.concat("\"", accessToken, "\", ");
										   callbackCount++;
									   },

									   onFailure: function(err) {
										   pausecomp(Math.floor(Math.random() * 1000) + 0);
										   cognitoUser.authenticateUser(authenticationDetails, {
											   onSuccess: function(result) {
												   var accessToken = result.getAccessToken().getJwtToken();
												   res = res.concat("\"", accessToken, "\", ");
												   callbackCount++;
											   },

											   onFailure: function(err) {
													pausecomp(Math.floor(Math.random() * 1000) + 0);
												   cognitoUser.authenticateUser(authenticationDetails, {
													   onSuccess: function(result) {
														   var accessToken = result.getAccessToken().getJwtToken();
														   res = res.concat("\"", accessToken, "\", ");
														   callbackCount++;
													   },

													   onFailure: function(err) {
															pausecomp(Math.floor(Math.random() * 1000) + 0);
														    cognitoUser.authenticateUser(authenticationDetails, {
															   onSuccess: function(result) {
																   var accessToken = result.getAccessToken().getJwtToken();
																   res = res.concat("\"", accessToken, "\", ");
																   callbackCount++;
															   },

															   onFailure: function(err) {
																	pausecomp(Math.floor(Math.random() * 1000) + 0);
																	cognitoUser.authenticateUser(authenticationDetails, {
																	   onSuccess: function(result) {
																		   var accessToken = result.getAccessToken().getJwtToken();
																		   res = res.concat("\"", accessToken, "\", ");
																		   callbackCount++;
																	   },

																	   onFailure: function(err) {
																			pausecomp(Math.floor(Math.random() * 1000) + 0);
																			cognitoUser.authenticateUser(authenticationDetails, {
																			   onSuccess: function(result) {
																				   var accessToken = result.getAccessToken().getJwtToken();
																				   res = res.concat("\"", accessToken, "\", ");
																				   callbackCount++;
																			   },

																			   onFailure: function(err) {
																					pausecomp(Math.floor(Math.random() * 1000) + 0);
																					cognitoUser.authenticateUser(authenticationDetails, {
																					   onSuccess: function(result) {
																						   var accessToken = result.getAccessToken().getJwtToken();
																						   res = res.concat("\"", accessToken, "\", ");
																						   callbackCount++;
																					   },

																					   onFailure: function(err) {
																							pausecomp(Math.floor(Math.random() * 1000) + 0);
																							cognitoUser.authenticateUser(authenticationDetails, {
																							   onSuccess: function(result) {
																								   var accessToken = result.getAccessToken().getJwtToken();
																								   res = res.concat("\"", accessToken, "\", ");
																								   callbackCount++;
																							   },

																							   onFailure: function(err) {
																									pausecomp(Math.floor(Math.random() * 1000) + 0);
																									cognitoUser.authenticateUser(authenticationDetails, {
																									   onSuccess: function(result) {
																										   var accessToken = result.getAccessToken().getJwtToken();
																										   res = res.concat("\"", accessToken, "\", ");
																										   callbackCount++;
																									   },

																									   onFailure: function(err) {
																										   console.log(err);
																										   callbackCount++;
																									   },
																								  }); 
																							   },
																						  }); 
																					   },
																				  }); 
																			   },
																		  }); 
																	   },
																  }); 
															   },
														  }); 
													   },
												  }); 
											   },
										  }); 
									   },
								  }); 
							   },
						  }); 
					   },
				  }); 
               },
          }); 
      },
   }); 
   },
});
}

continueExec();

function continueExec() {
    //here is the trick, wait until var callbackCount is set number of callback functions
    if (callbackCount < 100) {
        setTimeout(continueExec, 1000);
        return;
    }
    //Finally, do what you need
var fs = require('fs')
fs.readFile("load/load.lua", 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  var result = data.replace(/COGNITO_TOKEN_PLACEHOLDER/g, res.substring(0, res.length - 2));

  fs.writeFile("load/load.lua", result, 'utf8', function (err) {
     if (err) return console.log(err);
  });
});
}

function pausecomp(millis)
{
    var date = new Date();
    var curDate = null;
    do { curDate = new Date(); }
    while(curDate-date < millis);
}
