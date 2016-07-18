// ARN 
'use strict';
module.change_code = 1;
var _ = require('lodash');
var Alexa = require('alexa-app');
var extend = require('node.extend');

var app = new Alexa.app('zetta');

app.launch(function(req, res) {
  var prompt = 'To control your devices, tell me a command.';
  res.say(prompt).reprompt(prompt).shouldEndSession(false);
});

var deviceSlots = {'DEVICENAME':'LITERAL', 'DEVICETYPE':'DEVICETYPE', 'SERVERNAME':'LITERAL'};
var deviceUtterance = "{|the} {DEVICENAME|DEVICETYPE} {|on|in|at} {|SERVERNAME}";
    
app.intent('stateIntent', {
    'slots': deviceSlots,
    'utterances': ["{|what is|what's} {|the} {|state|status} {|of|for} " + deviceUtterance]
  },

  function(req, res) {
    //get the slot
    var device = req.slot('DEVICE');
    var reprompt = 'Tell me a device name to hear its status.';
    if (_.isEmpty(device)) {
      var prompt = 'I didn\'t hear a device name. Tell me a device name.';
      res.say(prompt).reprompt(reprompt).shouldEndSession(false);
      return true;
    } else {
      res.say(device + ' is on').send();
      return false;
    }
  }
);

deviceSlots = extend(true, deviceSlots, {'DEVICEACTION': 'DEVICEACTION'});

app.intent('actionIntent', {
    'slots': deviceSlots,
    'utterances': ["{DEVICEACTION} " + deviceUtterance]
  },

  function(req, res) {
    //get the slot
    var deviceName = req.slot('DEVICENAME');
    var deviceType = req.slot('DEVICETYPE');
    var deviceAction = req.slot('DEVICEACTION');
    var serverName = req.slot('SERVERNAME');
    var reprompt = 'Tell me a device name to hear its status.';
    if (_.isEmpty(deviceAction)) {
      var prompt = 'I didn\'t hear a device action. Please give me a device action to request.';
      res.say(prompt).reprompt(reprompt).shouldEndSession(false);
      return true;
    } else {
      res.say('Now sending request to ' + deviceAction + ' ' + deviceName + ' ' + deviceType + ' at ' + serverName + '.').send();
      return false;
    }
  }
);

//hack to support custom utterances in utterance expansion string
var utterancesMethod = app.utterances;
app.utterances = function() {
  return utterancesMethod().replace(/\{\-\|/g, '{');
};

module.exports = app;