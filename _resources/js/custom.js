/*
 * --------------------------------------------------------------------------
 * custom js
 * --------------------------------------------------------------------------
 */

// vars for HEROKU
var ON_HEROKU = false;
if (location.host === 'vocode-app.herokuapp.com') ON_HEROKU = true;//On Heroku
else ON_HEROKU = false;//normally
const ARR_TRACKS_NAME = ["cello-double", "cello-double-2", "cello-phrase", "orchestra", "organ-C3", "sax-phrase"];
const DIR_SOUND_SOURCE = '/sounds/sources/';
const DIR_SOUND_OUTPUT = '/sounds/output/';
// hundle eel.js
//if (ON_HEROKU) $("script[src='/eel.js']").attr('src', '/assets/js/eel.js');

// init canvas context
var widthCnvs = 0;
var heightCnvs = 120;
var cnvs = new CnvsCtx();
cnvs.init();
cnvsCtx = cnvs.ctx();//get context
cnvsCtx.fillStyle = 'rgba(155, 187, 89, 1)';//draw color

// wave surfer
var wavesurfer;
var wavesurfer01;
var wavesurfer02;
var wavesurfer03;

// set vars value
const SIZE_FFT = 2048;
var RATE = 44100;
async function getRate() {
  RATE =  await eel.getGlobalVar(5)();
}
if (!ON_HEROKU) getRate();

// fft
var fft = new FFT(SIZE_FFT, RATE);
var spectrum = new  Uint8Array(SIZE_FFT);

// other vars
var x = new Array();
var y = new Array();
var w = new Array();
var h = new Array();

const LIMITED_NUMBER = 100; //500*44100/1024= 21533hz
const COUNTDOWNTIME = 3;
const MAX_SECOND_REC = 8;
const LIMIT_MIN_REC = 3;//3=3min
var flgCountUp = false;
var isRecording = false;

var recfilePath = "";
var sampleVoicePath = "";
var baseSoundTrackPath = "";
var finalizePath = "";

const DIV_INDICATOR = '<div id="indicatorBG" style=""><i class="fas fa-spinner animRotate"></i></div>';
const DIV_INDICATOR_DIZZY = '<div id="indicatorBG" style=""><i class="far fa-dizzy iconL"></i></div>';
const BTN_CLOSE_ALERT = '<button id="btnCloseAlert" type="button" class="btn btn-secondary">close</button>';

var nSelectedTrackId = 0;
var nSelectedInput = 0;

const HEIGHT_WAV_ON_CARD = 80;

var language = (window.navigator.languages && window.navigator.languages[0]) || window.navigator.language || window.navigator.userLanguage || window.navigator.browserLanguage;
var lang = "en";
var jsonObj = new Object();

var fScrollTop = 0.0;

var isPreparingRec = false;


// get json data at first.
async function loadJson() {
  return jsonObj = await $.getJSON("/assets/includes/lang.json");
}


// DOM ready
$(function() {

  // got json then rest of all
  loadJson().then(jsonObj => {

    // set language
    function setLanguageSettings() {
      if (language === "ja" || language === "ja-JP") {
        lang = "ja";
      }
      else {
        lang = "en";
      }

      $("#logo").attr('alt', jsonObj.appName[lang]);
  
      $('#descMain').html(jsonObj.description[lang]);// app description
      $('[notdefined="01"] span, [notdefined="02"] span').html(jsonObj.notDefined[lang]);// not defined
      $('#modalRecYourVoice i >').append(jsonObj.voiceTrack.btnRecYourVoice[lang]);// btn rec your voice
      $('#selectSampleVoice i >').append(jsonObj.voiceTrack.btnUseSampleVoice[lang]);// btn use sample voice
      $('#btnBaseTrackList i >').append(jsonObj.baseTrack.btnSelectSound[lang]);// btn select base sound
  
      $('#recModal').find('.modal-title').html('<i class="fas fa-microphone-alt"></i>' + jsonObj.recordYourVoice.title[lang]);// title rec your voice
  
      $('#settingsModal').find('.modal-title').html('<i class="fas fa-cogs"></i>' + jsonObj.settings.title[lang]);// title setting
      $('#viewSettings').find('h6').html('<i class="fas fa-microphone"></i>' + jsonObj.settings.inputDevice[lang]);// h6 input device
      $('#viewSettings .input-group-text').html(jsonObj.settings.chooseDevice[lang]);// choose input device
  
      $('#pageAboutAppBody').html(jsonObj.aboutBody[lang]);// about page body
      $('#license').html(jsonObj.license[lang]);// license in about page
      $('#pageSupportBody').html(jsonObj.supportBody[lang]);// support page body

      // re-write meta title, description
      $("meta[name='description']").attr('content', jsonObj.meta.description[lang]);
      $("meta[name='twitter:title']").attr('content', jsonObj.sns.title[lang]);
      $("meta[name='twitter:description']").attr('content', jsonObj.sns.description[lang]);
      $("meta[property='og:title']").attr('content', jsonObj.sns.title[lang]);
      $("meta[property='og:description']").attr('content', jsonObj.sns.description[lang]);
    }
    setLanguageSettings();


    // init in py
    if (!ON_HEROKU) eel.browserReload();
  
    //set height for not defined
    $('.notDefinedYet').css({'width': '100%', 'height': HEIGHT_WAV_ON_CARD, 'display': 'table'});
  
  
    // append base track list
    async function apendBaseTrackList() {
      var arrTracksName = [];
      if (ON_HEROKU) {
        arrTracksName = ARR_TRACKS_NAME;
      }
      else {
        arrTracksName =  await eel.getArrayBaseSoundTracksName()();
      }
      //console.log(arrTracksName);
  
      // width same as btn
      var width = $('#btnBaseTrackList').innerWidth();
      for(var key in arrTracksName) {
        $('#baseTrackList').append('<li><a class="trackList" href="#" style="width: ' + width + 'px !important;"><i class="far fa-file-audio icon"></i>' + arrTracksName[key] +   '</a></li>');
      }
    }
    apendBaseTrackList();
    
    // select base track list
    $('#baseTrackList').on('click', '.trackList', async function(){
      nSelectedTrackId = $('#baseTrackList a.trackList').index(this);
      console.log(nSelectedTrackId + 'th item clicked!');
      // set item in py, also get path
      setBaseSoundTrackThenReturnPath(nSelectedTrackId);
    });
    async function setBaseSoundTrackThenReturnPath(nSelected){
      // set item in py, also get path
      if (ON_HEROKU) {
        baseSoundTrackPath =  DIR_SOUND_SOURCE + ARR_TRACKS_NAME[nSelected] + '.wav';
      }
      else {
        baseSoundTrackPath = await eel.setBaseSoundTrack(nSelected)();
      }
      // init wave to left voice track card
      showCommViewVisibleWav(false, $('#viewVisibleWav02'), wavesurfer02);
      wavesurfer02 = waveSurferCommInit('#viewVisibleWav02', HEIGHT_WAV_ON_CARD);// init wave surfer
      initCommWaveSurferMethod(wavesurfer02);//init method
      showCommWavesurfer(baseSoundTrackPath, $('#viewVisibleWav02'), wavesurfer02);// show wave surfer
  
      // replace title as selected
      var selectedTitle = $('#baseTrackList li a.trackList').eq(nSelected).html();
      $('#btnBaseTrackList').html(selectedTitle);
  
      // get back prev position
      $(window).scrollTop(fScrollTop);
    }
  
    $('#btnBaseTrackList').on('click', function(){
      // get scrop position
      fScrollTop = $(window).scrollTop();
    });
  
  
    // select sample voice in voice track
    $('#selectSampleVoice').on('click', function(){
      // set sample voice in py, also get path
      setSampleVoiceThenReturnPath();
    });
    async function setSampleVoiceThenReturnPath(){
      // set sample voice in py, also get path
      if (ON_HEROKU) {
        sampleVoicePath = DIR_SOUND_SOURCE + 'singing-female.wav';
      }
      else {
        sampleVoicePath = await eel.setSampleVoice()();
      }
  
      // init wave to left voice track card
      showCommViewVisibleWav(false, $('#viewVisibleWav01'), wavesurfer01);
      wavesurfer01 = waveSurferCommInit('#viewVisibleWav01', HEIGHT_WAV_ON_CARD);// init wave surfer
      initCommWaveSurferMethod(wavesurfer01);//init method
      showCommWavesurfer(sampleVoicePath, $('#viewVisibleWav01'), wavesurfer01);// show wave surfer
    }
  
    // DO vocode!
    $('#doVocode').on('click', function(){
      // show indicator
      showIndicator($('body'), 0);//0is sipinner
  
      // retun now playing
      try {
        if (wavesurfer03.isPlaying()) {
          // remove indicator
          removeIndicator();
          // show indicator dizzy
          showIndicator($('body'), 1);//1is dizzy
          setTimeout(removeIndicator, 1000);
          return 0;
        }
      } catch (error) {
        console.log("error now playing")
        // remove indicator
        //removeIndicator();
      }
  
      // do vocode ! in py
      vocodeThenReturnPath();
    })
    .dblclick(function(e) { //// DO NOT ALLOW DOUBLE CLICK vocode Btn
      $(this).data('double', 2);
      detectedDoubleClick();
      return 0;
    });
    async function vocodeThenReturnPath(){
      // do vocode ! in py, also get path
      if (ON_HEROKU) {
        // check voice/base track path is available
        var arrCheckFlg = [true, true];
        if (!sampleVoicePath || sampleVoicePath === "") {
          arrCheckFlg[1] = false;
        }
        if (!baseSoundTrackPath || baseSoundTrackPath === "") {
          arrCheckFlg[0] = false;
        }

        // check error, no error, go moprhing
        if (arrCheckFlg[0] && arrCheckFlg[1]) {
          //console.log("No Error!!");
          var baseFileName = 'finalized';
          finalizePath = DIR_SOUND_OUTPUT + baseFileName + nSelectedTrackId + '.wav';
        }
        else { //error
          //console.log("Error, sound file is not set");
          alertSoundFileIsUnset(arrCheckFlg);
          // remove indicator
          setTimeout(removeIndicator, 500);
          return false;
        }
      }
      else {
        finalizePath = await eel.goMorphing()();
      }
  
      // init wave to left voice track card
      showCommViewVisibleWav(false, $('#viewVisibleWav03'), wavesurfer03);
      wavesurfer03 = waveSurferCommInit('#viewVisibleWav03', HEIGHT_WAV_ON_CARD);// init wave surfer
      initCommWaveSurferMethod(wavesurfer03);//init method
      showCommWavesurfer(finalizePath, $('#viewVisibleWav03'), wavesurfer03);// show wave surfer
  
      // remove indicator
      setTimeout(removeIndicator, 500);
    }
  
  
    // error alert from py
    try { eel.expose(alertSoundFileIsUnset); }
    catch{}
    function alertSoundFileIsUnset(arrErrors) {
      var baseTrack = "";
      var voiceTrack = "";
      if (!arrErrors[1]) {
        voiceTrack = "voice track";
      }
      if (!arrErrors[0]) {
        baseTrack = "base track";
      }
      
      isBoth = false;
      if (baseTrack != "" && voiceTrack != "") isBoth = true;
      var conjunction = lang=='en'?(isBoth?" are":" is"):" が";
      showAlert(voiceTrack + (isBoth?", ":"") + baseTrack + conjunction + " " + jsonObj.messages.unsetTrack[lang]);
    }
    
  
  
    // RECORD your voice
    var countdownProc;
    $('#recordYourVoice').on('click', function(){
      // check preparing for rec
      isPreparingForRecording().then(isPreparingRec => {
      
        if (!isPreparingRec) {
          msgNotAllowRecording();
          return;
        }
      
  
        if (isRecording) {
          // stop rec
          eel.stopRecording();
    
          // remove clock timer view / countdown view
          removeViewClockTimer();
          viewCountdownBG(false);
    
          // change btn
          addDisplayNone($('.fa-stop-circle'));//hide stop btn
          removeDisplayNone($('.fa-circle'));//show rec btn
    
          // flag now rec
          isRecording = false;
    
          return;
        }
        else {
          /*/ check user got output path
          if ( !checkCookie("OUTPATH_KEY") ) {
            return;
          }*/
          
          // remove view visible wave
          showViewVisibleWav(false);
    
          // flag now rec
          isRecording = true;
    
          // change btn
          addDisplayNone($('.fa-circle'));//hide rec btn
          removeDisplayNone($('.fa-stop-circle'));//show stop btn
        }
    
        maxSecond = COUNTDOWNTIME;
        // hide clock timer
        $('#viewRecTime').html("");
        // add view background
        viewCountdownBG(true);
    
        // timer for count
        countdownProc = setInterval(function(){ //every 1 second
    
          // change btn at first
          if (maxSecond === COUNTDOWNTIME) {
            addDisplayNone($('.fa-circle'));//hide rec btn
            removeDisplayNone($('.fa-stop-circle'));//show stop btn
            
          }
    
          // flag now count down
          flgCountUp = false;
    
          // add number with animation
          var strNunber = (maxSecond === 0 ? "Fire!" : maxSecond);
          $('#viewCountdown').html(strNunber);
    
          if (maxSecond <= 0) {
            //console.log("rec started!")
            // clear timer
            clearInterval(countdownProc);
    
            // clear text
            $('#viewCountdown').html('');
    
            // normaly count down
            if (flgCountUp) {
              // show clock timer
              $('#viewRecTime').html("00:00");
              // start count up clock
              clockTimer(flgCountUp, 0);
            }
            else {
              // show clock timer
              $('#viewRecTime').html("00:08");
              // start count down clock
              clockTimer(flgCountUp, MAX_SECOND_REC);
            }
    
            // fire recording in py
            eel.recordYourVoice();
          }
    
          // declease count & sleep
          maxSecond -= 1
        },1000)

      });

    }).dblclick(function(e) { //// DO NOT ALLOW DOUBLE CLICK Rec Btn
      $(this).data('double', 2);
      detectedDoubleClick();
      return 0;
    });
  
    function detectedDoubleClick() {
      console.log("double click");
      // show indicator
      showIndicator($('body'), 1);//1is dizzy face
      setTimeout(removeIndicator, 1200);
    }
  
    function viewCountdownBG(YN) {
      if (YN) {
        $('.modal-body').addClass('bodyBG');
  
        // set view position, width include padding
        var width = $('.modal-body').outerWidth();
        var height = $('.modal-body').outerHeight();
        var position = $('.modal-body').position();
        var positionSuper = $('.modal-content').position();
        $('#viewCountdown').css({'width': width, 'height': height, 'top': positionSuper.top+position.top, 'left': position.left, 'display': 'block'});
      }
      else {
        $('#viewCountdown').html('');
        $('.modal-body').removeClass('bodyBG');
      }
    }
  
      // clock timer 00:00:00
      var clockTimerProc;
      function clockTimer(wantCountUp, beginSecond) {
        var min = 0;
        var sec = beginSecond;
  
        // btn show/hide
        addDisplayNone($('.fa-circle'));//hide rec btn
        removeDisplayNone($('.fa-stop-circle'));//show stop btn
  
        // close wave surfer on index page on left voice track
        showCommViewVisibleWav(false, $('#viewVisibleWav01'), wavesurfer01);
  
        clockTimerProc = setInterval(function(){ //every 1 second
          
          // animation
          $('#viewCountdown').addClass('bgColorRed animFadeInOut');
          $('#recordYourVoice').addClass('animFadeInOut');
    
          var flgColor = false;
          // count proc
          if (wantCountUp) {
            // inclease count
            sec++;
            if (sec == 60) {
              // increase min
              min++;
              // make sec 0
              sec = 0;
            }
            // remain 5 second flag
            if ((min >= LIMIT_MIN_REC-1 && sec >= 55) || min >= LIMIT_MIN_REC) {
              flgColor = true;
            }
          }
          else {
            // declease count
            sec -= 1;
            // remain 3 second flag
            if (sec <= 3) {
              flgColor = true;
            }
    
          }
    
          // set color
          if (flgColor) {
            $('#viewRecTime').css('color', '#C3272B');
          }
          else {
            $('#viewRecTime').css('color', '#fff');
          }
          
          // 0 padding
          min = ( '00' + min ).slice(-2);
          sec = ( '00' + sec ).slice(-2);
    
          // show timer
          $('#viewRecTime').html(min + ":" + sec);
    
          if ( (!wantCountUp && sec <= 0) || (wantCountUp && min >= LIMIT_MIN_REC) ) {
            // show indicator
            showIndicator($('body'), 0);//1is dizzy face
  
            // stop rec
            eel.stopRecording();
            // remove View, clear timer
            removeViewClockTimer();
          }
        },1000);
      }
      function removeViewClockTimer() {
        // clear timer
        clearInterval(clockTimerProc);
        clearInterval(countdownProc);
        // remove view background, front number
        viewCountdownBG(false);
        $('#viewCountdown').removeClass('bgColorRed animFadeInOut');
        $('#recordYourVoice').removeClass('animFadeInOut');
    
        $('#viewRecTime').delay(1000).queue(function (next) {
          removeViewRecTime();
          next();
        });
    
        // flag now rec
        isRecording = false;
  
        // hide indicator
        setTimeout(removeIndicator, 100);
      }
      function removeViewRecTime() {
        // hide clock
        $('#viewRecTime').html("");
        $('#viewRecTime').css('color', '#fff');
    
        // change btn
        addDisplayNone($('.fa-stop-circle'));//hide stop btn
        removeDisplayNone($('.fa-circle'));//show rec btn
      }
  
  
    // open rec your voice modal
    $('#modalRecYourVoice').on('click', function() {
      // show indicator
      showIndicator($('body'), 0);//0is spinner
  
      $.when(
        // set canvas size first
        cnvs.getWidthHeight()
      )
      .done(function() {
        // call prepare rec in py
        if (!ON_HEROKU) eel.preparePlotAudioData();//already wrote proc for heroku in py, but do that here for not touching py ichiou

        // set play/pause btn as default
        addDisplayNone($('.fa-pause-circle'));//hide pause btn
        removeDisplayNone($('.fa-play-circle'));//show play btn
  
        // remove indicator
        removeIndicator();
      })
      .fail(function() {
        console.log('error');
  
        // remove indicator
        removeIndicator();
      });
    });
  
  
    // Cancel Rec
    $('#recModal').on('DOMSubtreeModified propertychange', function() { // detect property changing
      var display = $('#recModal').css('display');
      if (display === "none") removeRecModal();
    });
    function removeRecModal() {
      // remove timer, niew
      removeViewClockTimer();
      // remove rec clock
      removeViewRecTime();
  
      // stop audio callback in py
      if (!ON_HEROKU) eel.stopAudioCallback();
      
      // clear canvas
      cnvs.clearCanvas();
  
      // remove view visible wave
      showViewVisibleWav(false);
    }

    // check preparing for rec.
    async function isPreparingForRecording(){
      if (ON_HEROKU) {
        return isPreparingRec = await false;
      }
      else {
        return isPreparingRec = await eel.isPreparingForRecording()();
      }
    }

    // msg do not allow rec function
    try { eel.expose(msgNotAllowRecording); }
    catch{}
    function msgNotAllowRecording() {
      //alert(jsonObj.messages.notAllowRec[lang]);
      showAlert(jsonObj.messages.notAllowRec[lang]);
    }
  
  
    //       wave suefer      //
    // init wavesurfer
    function waveSurferInit(){
      wavesurfer = WaveSurfer.create({
        container: '#viewVisibleWav',
        waveColor: '#aaa',
        progressColor: '#333',
        height: heightCnvs,
        position: 'inhert',
        //mediaControls: true,
        responsive: true
      });
  
      // disable btn
      disableBtn($('#btnPlayReced'), true);
      disableBtn($('#btnBackward'), true);
    }
    waveSurferInit();
  
    // create wavesurfer
    function showWavesurfer() {
      $.when(
        // set canvas size first
        showViewVisibleWav(true)
      )
      .done(function() {
        if (!recfilePath) showAlert(jsonObj.messages.filenotfound[lang]);
        wavesurfer.load(recfilePath);
      })
      .fail(function() {
        console.log('visible wave error');
      });
    }
  
    // show/unshow wavesurfer
    function showViewVisibleWav(YN) {
      // show visualize wave
      if (YN) {
        $('#viewVisibleWav').removeClass('displayNone');
        $('#viewVisibleWav').attr('height', heightCnvs);
      }
      else {
        try {
          // pause audio
          $('#viewVisibleWav').trigger('click');
  
          // clear canvas
          $('#viewVisibleWav').find('canvas').each( function( index, element ) {
          var width = $('#viewVisibleWav').outerWidth();
          var context = element.getContext("2d");
          context.clearRect(0, 0, width, heightCnvs);
        });
      }
      catch(e) {
        //console.log('viewVisibleWav stop wav canvasclear error');
      }
  
        // switch play/pause btn
        addDisplayNone($('.fa-pause-circle'));//hide pause btn
        removeDisplayNone($('.fa-play-circle'));//show play btn
  
        // disable btn
        disableBtn($('#btnPlayReced'), true);
        disableBtn($('#btnBackward'), true);
  
        // hide view
        $('#viewVisibleWav').addClass('displayNone');
      }
    }
  
    // close wavesurfer view
    $('[data-toggle=confirmation]').confirmation({ // close wavesurfer view
      title: jsonObj.recordYourVoice.closeConfirmWavsurfer[lang],
      rootSelector: '[data-toggle=confirmation]',
      onConfirm: function(value) {
        // clear wave
        wavesurfer.empty();
        // close wave view
        showViewVisibleWav(false);
      },
      onCancel: function() {
        // just hide confirmation view, nothing to do
      },
    });
  
    // hundle wavesurfer //
    /// on ready
    wavesurfer.on('ready', function () {
      // add style
      $('#viewVisibleWav > wave').css({'opacity': 0.9, 'background-color': '#fff'});
  
      // enable btn
      disableBtn($('#btnPlayReced'), false);
      disableBtn($('#btnBackward'), false);
  
  
      // copy wave to left voice track card
      wavesurfer01 = waveSurferCommInit('#viewVisibleWav01', HEIGHT_WAV_ON_CARD);// init wave surfer
      initCommWaveSurferMethod(wavesurfer01);//init method
      showCommWavesurfer(recfilePath, $('#viewVisibleWav01'), wavesurfer01);// show wave surfer
    });
  
    // play/pause/stop
    function playReced() {
      wavesurfer.play();
      // switch play/pause btn
      addDisplayNone($('.fa-play-circle'));//hide play btn
      removeDisplayNone($('.fa-pause-circle'));//show pause btn
    }
    function pauseReced() {
      wavesurfer.pause();
      // switch play/pause btn
      addDisplayNone($('.fa-pause-circle'));//hide pause btn
      removeDisplayNone($('.fa-play-circle'));//show play btn
    }
    function stopReced() {
      wavesurfer.stop();
      // switch play/pause btn
      addDisplayNone($('.fa-pause-circle'));//hide pause btn
      removeDisplayNone($('.fa-play-circle'));//show play btn
    }
  
  
    /// finish play
    wavesurfer.on('finish', function () {
      stopReced();
    });
    // on click, doubleclick
    $('#viewVisibleWav').on('click', function () {
      pauseReced();
    }).dblclick(function(e) {
      $(this).data('double', 2);
      playReced();
    });
  
    // play button
    $('#btnPlayReced').on('click', function () {
      if ($(this).hasClass('disabled')) return;
  
      // play / pause
      if (wavesurfer.isPlaying()) {//now playing
        pauseReced();
      }
      else {//now pause
        playReced();
      }
    });
  
    // backward buton
    $('#btnBackward').on('click', function () {
      if ($(this).hasClass('disabled')) return;
      wavesurfer.seekTo(0);
    });
  
    // disable div
    $('.disabled').on('click', function () {
      console.log("disable button");
      return;
    });
  
  
  
    //      wave surfer common     //
    // wave surfer on index
    function waveSurferCommInit(elmName, height){
      return WaveSurfer.create({
        container: elmName,
        waveColor: '#aaa',
        progressColor: '#333',
        height: height,
        position: 'inhert',
        responsive: true
      });
    }
  
    // create common wavesurfer
    function showCommWavesurfer(filePath, elm, obj) {
      $.when(
        // set canvas size first
        showCommViewVisibleWav(true, elm, obj)
      )
      .done(function() {
        if (!filePath) showAlert(jsonObj.messages.filenotfound[lang]);
        try {
          obj.load(filePath);
        } catch(e) {
          console.log('error common wavesurfer load');
        }
      })
      .fail(function() {
        console.log('visible wave error');
      });
    }
  
    // show/unshow common wavesurfer
    function showCommViewVisibleWav(YN, elm, obj) {
      // show visualize wave
      if (YN) {
        elm.removeClass('displayNone');
        elm.attr('height', elm.outerHeight());
      }
      else {
        try {
          //stop audio
          var elmName = elm.attr('id');
          commStop(elmName, obj);
        }
        catch(e) {
        //console.log("stop wavesufer01 error");
        }
  
        try {
          // clear canvas
          elm.find('canvas').each( function( index, element ) {
            var width = elm.outerWidth();
            var height = elm.outerHeight();
            var context = element.getContext("2d");
            context.clearRect(0, 0, width, height);
          });
        }
        catch(e) {
          //console.log("stop wavesufer01 error");
        }
        // clear sound
        try {
          obj.empty();
        }
        catch (e) {
          //nothing
        }
  
        // clear view
        elm.html('');
  
        // hide hundle buttton
        switchHundleBtnShowing(false, elm);
      }
    }
  
    // hundle common wavesurfer //
    function initCommWaveSurferMethod(obj) {
      /// on ready
      obj.on('ready', function () {
        var elmName = "";
        switch (obj) {
          case wavesurfer01:
            elmName = '#viewVisibleWav01';
            break;
  
          case wavesurfer02:
            elmName = '#viewVisibleWav02';
            break;
  
          case wavesurfer03:
            elmName = '#viewVisibleWav03';
            // auto play
            commPlay(elmName, wavesurfer03);
            // set download btn visible , download file name
            var elmDL = '[dl=' + $('.dl').attr('dl') + ']';
            $(elmDL + ' a').attr('href', finalizePath);

            if (isTheBrowserDownloadAttrSupported()) {
              var date = new Date();
              var day = ("00" + (date.getMonth()+1)).slice( -2 ) + ("00" + date.getDate()).slice( -2 ) + ("00" + date.getHours()).slice( -2 ) + ("00"   + date.getMinutes()).slice(   -2 ) + ("00" + date.getSeconds()).slice( -2 );
              $(elmDL + ' a').attr('download', "finilized_" + day + ".wav");
              $(elmDL).removeClass('displayNone');
            }
            else {
              // add taget attr., remove download attr.
              //$(elmDL + ' a').removeAttr('download');
              //$(elmDL + ' a').attr('target', '_blank');
            }

            
            break;
      
          default:
            break;
        }
  
        // set hundle button display
        switchHundleBtnShowing(true, $(elmName));
        setHunleBtnPosition(elmName);
      });
      
      obj.on('finish', function () {
        var elmName = "";
        switch (obj) {
          case wavesurfer01:
            elmName = '#viewVisibleWav01';
            break;
    
          case wavesurfer02:
            elmName = '#viewVisibleWav02';
            break;
        
          case wavesurfer03:
            elmName = '#viewVisibleWav03';
            break;
  
          default:
            break;
        }
        // stop
        var thisName = '[playWave=' + $(elmName).prev('div').attr('playWave') + ']';
        commStop(thisName, obj);
      });
  
    }
  
    function setHunleBtnPosition(elmName){
      // get position in absolute
      var middle = $('.card-header').outerHeight() + parseInt($('.card-body').css('padding-top')) + $(elmName).attr('height')/2;
      var center = $(elmName).width() / 2;
  
      // set backward button
      var elmBack0 = '[backTo0=' + $(elmName).prev().prev().attr('backTo0') + ']';
      var left = center - $(elmBack0).width()/2;
      var top = middle - $(elmBack0).height()/2;
      $(elmBack0).css({'position': 'absolute', 'top': top, 'left': left, 'z-index': 5});
      // set play button
      var iconWidth = $(elmBack0).outerWidth();
      var elmPlayWave = '[playWave=' + $(elmName).prev('div').attr('playWave') + ']';
      $(elmPlayWave).css({'position': 'absolute', 'top': top, 'left': iconWidth + left, 'z-index': 6});
    }
  
    function switchHundleBtnShowing(YN, elm) {
      if (YN) {
        // show hundle button display
        var elmNotDefined = '[notdefined=' + elm.prev().prev().prev().attr('notdefined') + ']';
        var elmBack0 = '[backTo0=' + elm.prev().prev().attr('backTo0') + ']';
        var elmPlayWave = '[playWave=' + elm.prev('div').attr('playWave') + ']';
  
        // first, show play hide pause btn
        addDisplayNone($(elmPlayWave + ' .fa-pause-circle'));//hide pause btn
        removeDisplayNone($(elmPlayWave + ' .fa-play-circle'));//show play btn
  
        // hundle button do
        $(elmNotDefined).addClass('displayNone');
        $(elmBack0).removeClass('displayNone');
        $(elmPlayWave).removeClass('displayNone');
      }
      else {
        // hide hundle button display
        var elmNotDefined = '[notdefined=' + elm.prev().prev().prev().attr('notdefined') + ']';
        var elmBack0 = '[backTo0=' + elm.prev().prev().attr('backTo0') + ']';
        var elmPlayWave = '[playWave=' + elm.prev('div').attr('playWave') + ']';
        $(elmNotDefined).removeClass('displayNone');
        $(elmBack0).addClass('displayNone');
        $(elmPlayWave).addClass('displayNone');
      }
    }
  
  
    function commStop(elmName, obj) {
      //stop then to cuesor begin
      obj.stop();
      // switch play/pause btn
      addDisplayNone($(elmName + ' .fa-pause-circle'));//hide pause btn
      removeDisplayNone($(elmName + ' .fa-play-circle'));//show play btn
    }
    function commPause(elmName, obj) {
      obj.pause();
      // switch play/pause btn
      addDisplayNone($(elmName + ' .fa-pause-circle'));//hide pause btn
      removeDisplayNone($(elmName + ' .fa-play-circle'));//show play btn
    }
    function commPlay(elmName, obj) {
      obj.play();
      // switch play/pause btn
      addDisplayNone($(elmName + ' .fa-play-circle'));//hide play btn
      removeDisplayNone($(elmName + ' .fa-pause-circle'));//show pause btn
    }
  
  
    // on click, doubleclick
    $('#viewVisibleWav01, #viewVisibleWav02, #viewVisibleWav03').on('click touchmove', function () {
      // hundle click action
      clickVisibleWave($(this));
    })
    .dblclick(function(e) {
      // double click to play
      doubleClickTapToPlay($(this));
    });
    // double tap
    var tapped = false;
    $('#viewVisibleWav01, #viewVisibleWav02, #viewVisibleWav03').on("touchend",function(e) {
      //if tap is not set, set up single tap
      if (!tapped) {
        tapped = setTimeout(function() {
          // hundle click action
          clickVisibleWave($(this));
          tapped = false;
        },350);//wait 350ms then run single click code
      }
      //tapped within 350ms of last tap. double tap
      else {
        clearTimeout(tapped); //stop single tap callback
        tapped = false;
        // double tapped to play
        doubleClickTapToPlay($(this));
      }
      e.preventDefault();
    });
    
    // hundle click/tap
    function clickVisibleWave(elm) {
      var obj;
      switch (elm.attr('id')) {
        case 'viewVisibleWav01':
        obj = wavesurfer01;
          break;
  
        case 'viewVisibleWav02':
          obj = wavesurfer02;
          break;
      
        case 'viewVisibleWav03':
          obj = wavesurfer03;
          break;
  
        default:
          break;
      }
      var thisName = '[playWave=' + elm.prev('div').attr('playWave') + ']';
      commPause(thisName, obj);
    }

    // double click/tap to play
    function doubleClickTapToPlay(elm) {
      var thisName = '[playWave=' + elm.prev('div').attr('playWave') + ']';
      elm.data('double', 2);
  
      var obj;
      switch (elm.attr('id')) {
        case 'viewVisibleWav01':
        obj = wavesurfer01;
          break;
  
        case 'viewVisibleWav02':
          obj = wavesurfer02;
          break;
      
        case 'viewVisibleWav03':
          obj = wavesurfer03;
          break;
  
        default:
          break;
      }
      commPlay(thisName, obj);
    }
  
  
    // play button
    $('.btnPlay').on('click', function () {
      var nextElmId = $(this).next('div').attr('id');
      var thisName = '[playWave=' + $(this).attr('playWave') + ']';
      var  obj;
      if (nextElmId.match(/01/)) { // has id 01
        obj =  wavesurfer01;
      }
      else if (nextElmId.match(/02/)) { // has id 02
        obj = wavesurfer02;
      }
      else if (nextElmId.match(/03/)) { // has id 03
        obj = wavesurfer03;
      }
  
      // play / pause
      if (obj.isPlaying()) {//now playing
        commPause(thisName, obj);
      }
      else {//now pause/stop
        commPlay(thisName, obj);
      }
    });
  
    // backward buton
    $('.btnBack0').on('click', function () {
      var nextnextElmId = $(this).next().next().attr('id');
      //var thisName = '[backWard=' + $(this).attr('backWard') + ']';
      var  obj;
      if (nextnextElmId.match(/01/)) { // has id 01
        obj =  wavesurfer01;
      }
      else if (nextnextElmId.match(/02/)) { // has id 02
        obj = wavesurfer02;
      }
      else if (nextnextElmId.match(/03/)) { // has id 03
        obj = wavesurfer03;
      }
      obj.seekTo(0);
    });

 
    // set recorded file path from py when rec done
    try { eel.expose(setRecordedFilePath); }
    catch{}
    function setRecordedFilePath(path) {
      //console.log(recfilePath);
      recfilePath = path; //"/sounds/rec/reced.wav";
  
      // create wave surfer
      showWavesurfer();
    }
  
  
    //     settings      //
    $('#btnSettings').on('click', function () {
      $.when(
        // append input list
        setArrAudioInputs()
      )
      .done(function() {
        // selected device
      $('[name=nameInputList]').val(nSelectedInput);
      })
      .fail(function() {
        console.log('get input device error');
      });
    });
  
    // set input devices
    async function setArrAudioInputs() {
      // get available input devices
      var arrInputDevices = [];
      if (ON_HEROKU) {
        var arrTmp = [{ name:'not supported'}];
        arrInputDevices =  await arrTmp;
      }
      else {
        arrInputDevices =  await eel.getArrAudioInputs()();
      }
      //console.log(arrInputDevices);
  
      var option ="";
      for (var i = 0; i < Object.keys(arrInputDevices).length; i++) {
        var name = arrInputDevices[i]["name"];
        option += '<option value="'+i+'">'+name+'</option>';
      }
      $('#inputList').html(option);
    }
  
    $('[name=nameInputList]').change(function() {
      // get selected number
      nSelectedInput =  parseInt( $('[name=nameInputList]').val() );
      if (!ON_HEROKU) eel.setAudioInputdevicesNumber(nSelectedInput);
    });
  
  
    //          modal as web another page           //
    
    $('[id^="page"]').on('show.bs.modal', function () {
      // remove modal-body height
      $(this).find('.modal-body').removeAttr('style');
  
      // remove modal-dialog margin
      $(this).find('.modal-dialog').css({
        'margin': '0'
      });
  
      // set modal-content height
      var height = $(window).innerHeight();
      $(this).find('.modal-content').css({
        'max-width': '100%',
        'height': height
      });
    });


    // build download page //
    function buildDownloadPage() {
      // add text in download page body
      $('#pageDownloadBody').append('<p>'+jsonObj.downloadBody.leadTxt[lang]+'<p>');
      //
      if (isTheBrowserDownloadAttrSupported()) {
        $('#pageDownloadBody').append('<section id="areaDL"></section>');
        $('#areaDL').append('<div class="text-center"><a href="/download/macos/latest/vocode.app.zip" download="vocode.app.zip"><i class="fas fa-download"></i>download desktop app.</a></div>');
        $('#areaDL').append('<div class="text-center txtAttension">'+jsonObj.downloadBody.versionTxt[lang]+jsonObj.appName+' '+jsonObj.appVer  +'</div>');
        $('#areaDL').append('<div class="text-center txtAttension">'+jsonObj.downloadBody.requiredTxt[lang]+'</div>');
        $('#pageDownloadBody').append('<p>'+jsonObj.downloadBody.note[lang]+'<p>');
        $('#pageDownloadBody').append(jsonObj.downloadBody.command);
      }
    }
  
  
  
  
    //                   utillity                    //
  
    function setURLforSNS() {
      $('.nav-twitter').attr("href", "http://twitter.com/share?url="+jsonObj.appURL);
      $('.nav-facebook').attr("href", "https://www.facebook.com/sharer/sharer.php?u="+jsonObj.appURL);
    }
    setURLforSNS();


    function gAnalytics() {
      var gAnalyticsScript = "";
      getGAnalytics().then(gAnalyticsScript => {
        $('head').append(gAnalyticsScript);
      });
    }
    // get gAnalytics script in py
    async function getGAnalytics(){
      if (ON_HEROKU) {
        return jsonObj.gAnalytics;
      }
      else {
        return await eel.getGAnalytics()();
      }
    }


    function gAd() {
      var gadScript = "";
      getGAds(0).then(gadScript => {
        //$('.gAd').css('height', '50px');
        $('.gAd').html(gadScript);
        /*var elm = document.getElementsByClassName("gAd")
        elm[0].innerHTML = '';*/
        //console.log($('.gAd').html());
      });
    }
    // get gads script in py
    async function getGAds(nType){
      if (ON_HEROKU) {
        return jsonObj.gAds;
      }
      else {
        return await eel.getGAds(nType)();
      }
    }
  
  
    /*/ check cookie
    function checkCookie(key) {
      if ($.cookie(key) == undefined) {
        // show setting view output path area
        $('#settingsModal').modal('show');
        return false;
      }
      else {
        return true;
      }
    }*/
  
  
    function setOpacity(elm, value) {
      $(elm).css('opacity', value);
    }
  
  
    // spiner rotate indicator
    function showIndicator(elm, nType) {
      // set view position, width include padding
      var width = elm.outerWidth();
      var height = elm.outerHeight();
      var position = elm.position();
      var offset = elm.offset();
      var html;
  
      if (width < 1) {
        width = $(window).innerWidth();
      }
      if (height < 1) {
        height = $(window).innerHeight();
      }
  
      switch (nType) {
        case 0:
          html = (DIV_INDICATOR);
          break;
        case 1:
          html = (DIV_INDICATOR_DIZZY);
          break;
        default:
          break;
      }
  
      $.when(
        // append indicator div
        elm.prepend(html)
      )
      .done(function() {
        // add css
        $('#indicatorBG').css({'width': width, 'height': height, 'top': offset.top + position.top, 'left': position.left});
        $('#indicatorBG').addClass('indicatorBGDetail');
      })
      .fail(function() {
        console.log('indicator error');
      });
    }
    function removeIndicator() {
      console.log("remove indicator");
      $('#indicatorBG').remove();
    }
  
    function addDisplayNone(elm) {
      elm.addClass('displayNone');
    }
    function removeDisplayNone(elm) {
      elm.removeClass('displayNone');
    }
  
    function disableBtn(elm, YN) {
      if (YN) { //yes, turn disable
        elm.addClass("disabled");
      }
      else {
        elm.removeClass("disabled");
      }
    }

    
    // alert massage
    function addCloseAlertButton() {
      $('.alert').html(BTN_CLOSE_ALERT);//init
    }
    addCloseAlertButton();
    function showAlert(msg){
      // show body
      $('.alert').removeClass('displayNone');
      $('.alert').removeClass('alert-remove');

      // set btn width
      var width = $('#doVocode').innerWidth() /2;
      $('#btnCloseAlert').css('width', width);

      // set body position
      var top = $(window).scrollTop();
      $('.alert').css('top', top);

      // if msg == not allow rec message.
      var msgNotAllowRec = "";
      if (msg === jsonObj.messages.notAllowRec[lang]) {
        msgNotAllowRec = '<br><a data-toggle="modal" data-target="#pageDownload" href="#"><i class="fas fa-link iconWhite"></i>'+jsonObj.messages.openPageDL[lang]+'</a>';
      }

      // set message
      $('.alert').prepend('<p><i class="fas fa-exclamation-triangle iconWhite"></i>'+msg+msgNotAllowRec+'</p>');
      $('.alert').alert();
    }
    $('.alert').on('click', function () {
      // remove alert
      $('.alert').addClass('alert-remove');
      $('.alert').addClass('displayNone');
      $('.alert').html(BTN_CLOSE_ALERT);
    });


    // unsupported browser //
    function isTheBrowserDownloadAttrSupported() {
      var userAgent = window.navigator.userAgent.toLowerCase();
      var isSupport = false;

      if(userAgent.indexOf('msie') != -1 || userAgent.indexOf('trident') != -1) {
          //console.log('Internet Explorer');
          isSupport = false;
      }
      else if(userAgent.indexOf('edge') != -1) {
          //console.log('Edge');
          isSupport = true;
      }
      else if(userAgent.indexOf('chrome') != -1) {
          //console.log('Google Chrome');
          isSupport = true;
      }
      else if(userAgent.indexOf('safari') != -1) {
          //console.log('Safari');
          isSupport = true;
      }
      else if(userAgent.indexOf('firefox') != -1) {
          //console.log('FireFox');
          isSupport = true;
      }
      else if(userAgent.indexOf('opera') != -1) {
          //console.log('Opera');
          isSupport = false;
      } else {
          //console.log('unknown one');
          isSupport = false;
      }

      // but iPhone, iPad, android are unsupported
      if (userAgent.indexOf('iphone') != -1 || userAgent.indexOf('ipad') != -1 || userAgent.indexOf('android') != -1 || userAgent.indexOf('mobile') != -1) {
        isSupport = false;
      }

      return isSupport;
    }


    // ------------------------------------------------//
    //                cookie acception pure js                 //
    // ------------------------------------------------//
    /* arigato burnworks/ga-cookie-opt-in-js:
    https://github.com/burnworks/ga-cookie-opt-in-js/blob/master/src/js/ga-cookie-opt-in.js
    */
    //window.addEventListener('DOMContentLoaded', function() {
    
    // get cookie opt-in
    var cookieOptin = "";
    async function getCookieOptIn() {
      // get value of ga_cookie_opt_in from localStorage
      return cookieOptin = await localStorage.getItem('ga_cookie_opt_in');
    }
    
    function setCookieAccepption() {
      // get value of ga_cookie_opt_in from localStorage
      //var cookieOptin = localStorage.getItem('ga_cookie_opt_in');
    
      // disable cookie, if ga_cookie_opt_in = no
      if(cookieOptin == 'no') {
        console.log('ga_cookie_opt_in = no / ga-disable = true');
        // disable GA, PersonalizedGAD
        window['ga-disable-UA-125578119-1'] = true;
        (adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=1;//nonpersonalyzed ad
        (adsbygoogle=window.adsbygoogle||[]).pauseAdRequests=0;//request ad
      }
    
      // enable cookie, if ga_cookie_opt_in = yes
      else if(cookieOptin == 'yes') {
        console.log('ga_cookie_opt_in = yes');
        // enable GA, PersonalizedGAD
        window['ga-disable-UA-125578119-1'] = false;
        (adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=0;//personalyzed ad
        (adsbygoogle=window.adsbygoogle||[]).pauseAdRequests=0;//request ad
      }
    
      // disable cookie temp., if ga_cookie_opt_in = null
      else {
        console.log('ga_cookie_opt_in = null');
        // disable GA, pause PersonalizedGAD
        window['ga-disable-UA-125578119-1'] = true;
        (adsbygoogle=window.adsbygoogle||[]).pauseAdRequests=1;//pause ad
    
        // get w, h, position
        //var rect = document.getElementById('viewCookieAcceptBar').getBoundingClientRect();
        
        // show cookie acception bar
        var accept = document.createElement('div');
            accept.setAttribute('class', 'cookie-accept-bar');
            accept.setAttribute('id', 'barCookieAccept');
            //accept.setAttribute('style', 'top: '+rect.top+'px;');
            accept.innerHTML = '<p><i class="fas fa-exclamation-triangle iconWhite"></i>'+jsonObj.GDPR.description[lang]+' <a href="https://policies.google.com/technologies/partner-sites" target="_blank"><i class="fas fa-link iconWhite"></i>'+jsonObj.GDPR.policy[lang]+'</a><p><button id="btnCookieAccept" class="btn cookie-accept-btn"><i class="fas fa-check iconWhite"></i>'+jsonObj.GDPR.btnAccept[lang]+'</button><button id="btnCookieDeny" class="btn cookie-accept-btn cookie-deny-btn"><i class="fas fa-times iconWhite"></i>'+jsonObj.GDPR.btnDeny[lang]+'</button></p>';
    
        // show on base view
        var elmCAB = document.getElementById("viewCookieAcceptBar");
        elmCAB.appendChild(accept);
    
        // resize
        barCookieAcceptFollowWindowResize();
      }
    
      // get buttons
      var acceptBtn = document.getElementById('btnCookieAccept');
      var denyBtn   = document.getElementById('btnCookieDeny');
    
      // btn accept, opt-in YES
      if(acceptBtn) {
        acceptBtn.onclick = function() {
          localStorage.setItem('ga_cookie_opt_in','yes');
          reloadWithAnimation('barCookieAccept', 400);
        };
      }
    
      // btn deny, opt-in NO
      if(denyBtn) {
        denyBtn.onclick = function() {
          localStorage.setItem('ga_cookie_opt_in','no');
          reloadWithAnimation('barCookieAccept', 400);
        };
      }
    
      function reloadWithAnimation(strId, nTime) {
        document.getElementById(strId).classList.add('state-remove');
        window.setTimeout('window.location.reload(false)', nTime);
      }
    }

    // hundle cookie acception
    var timerCookieBar = false;
    function cookieAccepption() {
      getCookieOptIn().then(cookieOptin => {
        if (timerCookieBar !== false) clearTimeout(timerCookieBar);
        timerCookieBar = setTimeout(function() {
          setCookieAccepption();
        }, 8000);
      });
    }

    //cookieAccepption();
    //});


    // ------------------------------------------------//
    //                other events                       //
    // ------------------------------------------------//
    
    // resize event //
    var timerResize = false;
    $(window).on('resize', function() {
      if (timerResize !== false) clearTimeout(timerResize);
      timerResize = setTimeout(function() {
        
        // follow cookie acception bar
        barCookieAcceptFollowWindowResize();

      }, 400);
    });
    
    
    // scroll event //
    var timerScroll = false;
    $(window).on('scroll', function() {
      if (timerScroll !== false) clearTimeout(timerScroll);
      timerScroll = setTimeout(function() {
        var fScrollTop = $(this).scrollTop();

        // follow cookie acception bar
        barCookieAcceptFollowWindowResize(fScrollTop);

        // follow alert body
        alertDialogBodyFollowWindowResize(fScrollTop);
      }, 400);
    });


    // follow cookie acception bar
    function barCookieAcceptFollowWindowResize(fScrollTop) {
      var fScroll = fScrollTop ? fScrollTop : 0;
      var height = window.innerHeight;
      var elmBCA = document.getElementById('barCookieAccept');
      if (elmBCA) elmBCA.setAttribute('style', 'top: '+(height - elmBCA.offsetHeight + fScroll)+'px;');
    }


    // follow alert body
    function alertDialogBodyFollowWindowResize(fScrollTop) {
      var fScroll = fScrollTop ? fScrollTop : 0;
      var elmAlert = $('.alert');
      if (elmAlert) elmAlert.css('top', fScroll);
    }




    // add/remove some functions/page as online web app
    isPreparingForRecording().then(isPreparingRec => {
      if (!isPreparingRec) { // on web
        // show download nav
        $('#navbarNav ul.navbar-nav  :nth-of-type(3)').removeClass('displayNone');

        // build download page
        buildDownloadPage();

        // set ganalytics
        gAnalytics();

        // show gad
        gAd();

        // show cookie acception
        cookieAccepption();

      }
    });


  });
});




// ------------------------------------------------//
//                visualyzer                       //
// ------------------------------------------------//

// set up canvas
function CnvsCtx(){
  this.init = function(){
    // set canvas height
    $('.modal-body').css('height', heightCnvs);
    this.setCanvasSize(heightCnvs);
  };

  // get width, height
  this.getWidthHeight = function(){
    // get view width for visualyzer imidiatelly
    widthCnvs = $('.modal-body').innerWidth();
    this.setCanvasSize(heightCnvs);

    // set css
    $('#recMicInput').css({'top':0, 'left':0});
    $('#recMicInput').css({'position':'absolute'});

    // get view width for visualyzer
    $('#recMicInput').on('load', function() {
      widthCnvs = $('.modal-body').innerWidth();
      this.setCanvasSize(heightCnvs);
    });
  };

  // get context
  this.ctx = function (){
    return $('#recMicInput')[0].getContext("2d");
  };

  // draw
  this.drawVisualizer = function (x, y, w, h, nHAbillity) {
    cnvsCtx.fillStyle = 'rgba(155, 187, 89, 1)';//draw color
    //console.log("draw");
    for(var i = 0; i < nHAbillity; i++) {
      //if (i > 0) cnvsCtx.fillRect(x[i-1], y[i-1], 0, 0);
      cnvsCtx.fillRect (x[i], y[i] , w[i], h[i]);
      //console.log("%f, %f, %f, %f", x[i], y[i], w[i], h[i]);
    }
  };

  // 
  this.setCanvasSize = function (height) {
    // set canvas height
    $('.modal-body').css('height', height);
    $('#recMicInput').attr('height', height);
    heightCnvs = height;
  };

  // clear canvas
  this.clearCanvas = function () {
    cnvsCtx.clearRect(0, 0, widthCnvs, heightCnvs);
  };
}


// visualize from py
try { eel.expose(plotAudioData); }
catch{}
function plotAudioData(buffer) {
  //console.log("buffer.length:"+buffer.length);

  // if width/height 0 get it
  if (widthCnvs === 0 || heightCnvs === 0) cnvs.getWidthHeight();

  // clear canvas
  cnvs.clearCanvas();

  // perform forward transform
  fft.forward(buffer);
  spectrum = fft.spectrum;

  // calc visualizer width
  var barWidth =   Math.ceil(widthCnvs / LIMITED_NUMBER);
  //console.log("width:"+barWidth);

  // calc detail to draw
  var persent = "";
  for(var i = 0; i < LIMITED_NUMBER; i++) {
    var freqData = Math.abs(spectrum[i]);
    if(!freqData) freqData = 0;
    else persent = freqData / heightCnvs;

    var height = Math.ceil(heightCnvs * persent * 100000); // calc H in %
    var offset = Math.ceil(heightCnvs - height); // offset begin pont

    x[i] = parseInt( i * barWidth );
    y[i] = parseInt( offset );
    w[i] = parseInt( barWidth);
    h[i] = parseInt( height );
      
    // get freq
    //var freq = i * 44100 / SIZE_FFT / 2;
    //console.log(freq + "Hz"); 
  }
  // draw
  cnvs.drawVisualizer(x, y, w, h, LIMITED_NUMBER);
}
