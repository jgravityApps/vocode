#! /usr/bin/ python3
# -*- coding: utf-8 -*-

#import eel
import pyaudio as pa
import wave
from time import sleep
import threading
import soundfile as sf
import numpy as np
from scipy.fftpack import fft, ifft
from scipy import signal, arange, hamming, hanning, sin, pi
from scipy.signal import resample, butter, lfilter, freqz
import sys, os
import math
import socket

application_path = os.getcwd()
if getattr(sys, 'frozen', False):
    application_path = os.path.dirname(sys.executable)
#elif __file__:
#    application_path = os.path.dirname(__file__)


sys.path.append(os.path.join(os.path.dirname(os.path.realpath(sys.argv[0])), application_path))
import commonUtillity as commUtill
import googleUtillity as gUtill
import dftModel as DFT
import audio
import effects.IIRFilters as IIRFilter
import effects.flanger as flanger
import effects.reverb as reverb
import re
import customEel as eel


eel.init("html")


# global vars
inputPath = application_path + "/html/sounds/sources/"
outputPath = application_path + "/html/sounds/output/"
morphedFileName = "finalized.wav"
CHUNK = 1024
CHANNELS = 1
RATE = 44100
N = 1024
RECFILEPATH = ""
RECORD_SECONDS = 8

# UI Value
nHop = 4 #1-5
fSmooth = 0.3 #0.1-1.0
fBalance = 0.7 #0.1-1.0

#sound data np array
soundBase = np.array([])
soundMain = np.array([])
nSelectedSoundBase = 0



class Sounds:

    def initSoundSettings(self, wav):
        global CHANNELS, RATE
        CHANNELS = self.getChannels(wav)
        RATE = self.getFrameRate(wav)

    def getChannels(self, wav):
        return wav.getnchannels()

    def getFrameRate(self, wav):
        return wav.getframerate()

    def getFrames(self, wav):
        return wav.size

    def getSound(self, filePathName):
        global RATE

        # get real file path
        filePath = commUtill.getRightPath(filePathName)

        # read wav
        wav, RATE = sf.read(filePath)
        return wav

    def parallelSounds(self, data1, data2):
        global RATE
        morphed = data1
        for n in range(data1.size):
            morphed[n] = data1[n] * 0.5 + data2[n] * 0.5
        commUtill.writeSoundFile(morphedFileName, morphed, RATE)
        return morphedFileName


class Morphing:

    # functions that implement transformations using the stft
    def stftFiltering(self, x, fs, w, N, H, filter):
    	"""
    	Apply a filter to a sound by using the STFT
    	x: input sound, w: analysis window, N: FFT size, H: hop size
    	filter: magnitude response of filter with frequency-magnitude pairs (in dB)
    	returns y: output sound
    	"""

    	M = w.size                                     # size of analysis window
    	hM1 = math.floor((M +1) // 2)                 # half analysis window size by rounding
    	hM2 = math.floor(M // 2)                      # half analysis window size by floor
    	x = np.append(np.zeros(hM2), x)                 # add zeros at beginning to center first window at sample 0
    	x = np.append(x, np.zeros(hM1))                 # add zeros at the end to analyze last sample
    	pin = hM1                                      # initialize sound pointer in middle of analysis window
    	pend = x.size -hM1                              # last sample to start a frame
    	w = w / sum(w)                                 # normalize analysis window
    	y = np.zeros(x.size)                           # initialize output array
    	while pin <= pend:                               # while sound pointer is smaller than last sample
    	    #-----analysis-----  
    		x1 = x[pin -hM1 : pin +hM2]                    # select one frame of input sound
    		mX, pX = DFT.dftAnal(x1, w, N)             # compute dft
    	    #------transformation-----
    		mY = mX + filter                           # filter input magnitude spectrum
    	    #-----synthesis-----
    		y1 = DFT.dftSynth(mY, pX, M)               # compute idft
    		y[pin -hM1 : pin +hM2] += H * y1                 # overlap-add to generate output sound
    		pin += H                                   # advance sound pointer
    	y = np.delete(y, range(hM2))                   # delete half of first window which was added in stftAnal
    	y = np.delete(y, range(y.size -hM1, y.size))    # add zeros at the end to analyze last sample
    	return y

    def stftMorph(self, x1, x2, fs, w1, N1, w2, N2, H1, smoothf, balancef):
        """
        Morph of two sounds using the STFT
        x1, x2: input sounds, fs: sampling rate
        w1, w2: analysis windows, N1, N2: FFT sizes, H1: hop size
        smoothf: smooth factor of sound 2, bigger than 0 to max of 1, where 1 is no smothing,
        balancef: balance between the 2 sounds, from 0 to 1, where 0 is sound 1 and 1 is sound 2
        returns y: output sound
        """
        if (N2 / 2 *smoothf < 3):                           # raise exception if decimation factor too small
            raise ValueError("Smooth factor too small")
        if (smoothf > 1):                                # raise exception if decimation factor too big
            raise ValueError("Smooth factor above 1")
        if (balancef > 1 or balancef < 0):               # raise exception if balancef outside 0-1
            raise ValueError("Balance factor outside range")
        if (H1 <= 0):                                    # raise error if hop size 0 or negative
            raise ValueError("Hop size (H1) smaller or equal to 0")
        
        M1 = w1.size                                     # size of analysis window
        hM1_1 = math.floor((M1 +1) //2)                # half analysis window size by rounding
        hM1_2 = math.floor(M1 //2)                    # half analysis window size by floor
        L = x1.size // H1                             # number of frames for x1
        x1 = np.append(np.zeros(hM1_2), x1)               # add zeros at beginning to center first window at sample 0
        x1 = np.append(x1, np.zeros(hM1_1))               # add zeros at the end to analyze last sample
        pin1 = hM1_1                                     # initialize sound pointer in middle of analysis window
        
        w1 = w1 / sum(w1)                                # normalize analysis window
        M2 = w2.size                                     # size of analysis window
        hM2_1 = math.floor((M2 +1) /2)                # half analysis window size by rounding
        hM2_2 = math.floor(M2 /2)                    # half analysis window size by floor2
        H2 = x2.size // L                              # hop size for second sound
        x2 = np.append(np.zeros(hM2_2), x2)               # add zeros at beginning to center first window at sample 0
        x2 = np.append(x2, np.zeros(hM2_1))               # add zeros at the end to analyze last sample
        pin2 = hM2_1                                     # initialize sound pointer in middle of analysis window
        y = np.zeros(x1.size)                            # initialize output array
        for l in range(L):                                   
            #-----analysis-----  
            mX1, pX1 = DFT.dftAnal(x1[pin1 -hM1_1 : pin1 +hM1_2], w1, N1)           # compute dft
            mX2, pX2 = DFT.dftAnal(x2[pin2 -hM2_1 : pin2 +hM2_2], w2, N2)           # compute dft
            #-----transformation-----
            mX2smooth = resample(np.maximum(-200, mX2), int(mX2.size * smoothf))       # smooth spectrum of second sound
            mX2 = resample(mX2smooth, mX1.size)                                 # generate back the same size spectrum
            mY = balancef * mX2 + (1 -balancef) * mX1                            # generate output spectrum
            #-----synthesis-----
            y[pin1 -hM1_1 : pin1 +hM1_2] += H1 * DFT.dftSynth(mY, pX1, M1)  # overlap-add to generate output sound
            pin1 += H1                                     # advance sound pointer
            pin2 += H2                                     # advance sound pointer
        y = np.delete(y, range(hM1_2))                   # delete half of first window which was added in stftAnal
        y = np.delete(y, range(y.size-hM1_1, y.size))    # add zeros at the end to analyze last sample
        
        # write morphed sound data
        outputFullPath = outputPath + morphedFileName
        #path4Writing = getRightPath(outputFullPath)
        #sf.write(path4Writing, y, RATE)
        # write sound file in env
        commUtill.writeSoundFile(outputFullPath, y, RATE)
        return outputFullPath



@eel.expose
def getGAds(nType):
    return gUtill.getGAds(nType)

@eel.expose
def getGAnalytics():
    return gUtill.getGAnalytics()


@eel.expose
def getArrayBaseSoundTracksName():
    arrTracks = ["cello-double", "cello-double-2", "cello-phrase", "orchestra", "organ-C3", "sax-phrase"]
    return arrTracks

@eel.expose
def setBaseSoundTrack(num):
    global soundBase, nSelectedSoundBase
    # store selected num
    nSelectedSoundBase = num

    # set sound base
    path = ""
    Sound = Sounds()
    if num == 0:
        soundBase = Sound.getSound(inputPath + "cello-double" + ".wav")
        path = (inputPath + "cello-double" + ".wav")
    elif num == 1:
        soundBase = Sound.getSound(inputPath + "cello-double-2" + ".wav")
        path = (inputPath + "cello-double-2" + ".wav")
    elif num == 2:
        soundBase = Sound.getSound(inputPath + "cello-phrase" + ".wav")
        path = (inputPath + "cello-phrase" + ".wav")
    elif num == 3:
        soundBase = Sound.getSound(inputPath + "orchestra" + ".wav")
        path = (inputPath + "orchestra" + ".wav")
    elif num == 4:
        soundBase = Sound.getSound(inputPath + "organ-C3" + ".wav")
        path = (inputPath + "organ-C3" + ".wav")
    elif num == 5:
        soundBase = Sound.getSound(inputPath + "sax-phrase" + ".wav")
        path = (inputPath + "sax-phrase" + ".wav")
    #commUtill.logger.debug(str(num) + "slected!")
    baseTrackPath4Web = path.replace(application_path+"/html", '', 1)
    return baseTrackPath4Web

@eel.expose
def setSampleVoice():
    global soundMain
    path = inputPath + "singing-female" + ".wav"

    Sound = Sounds()
    soundMain = Sound.getSound(path)
    
    sampleVoicePath4Web = path.replace(application_path+"/html", '', 1)
    #commUtill.logger.debug("set sample voice: "+sampleVoicePath4Web)

    return sampleVoicePath4Web


@eel.expose
def browserReload():
    #startEel() #connection to eel
    makeEmptySoundArray()
    stopAudioCallback() #stop callback
    audio.isRecording = False #stop recording


def isInLocalHost():
    #return False #for test
    # on heroku
    if commUtill.ON_HEROKU:
        commUtill.logger.debug("HEROKU env.")
        return False
    
    ref = socket.gethostname() #os.uname()[1]
    commUtill.logger.debug(ref)
    if re.match('.*local', ref):
        return True
    else:
        commUtill.logger.debug(ref + " refused")
        return False


@eel.expose
def isPreparingForRecording():
    return isInLocalHost()


@eel.expose
def recordYourVoice():
    # check local host
    if isInLocalHost() == False:
        js_MsgNotAllowRecording()
        return

    #commUtill.logger.debug("rec start")
    audio.audioFrames = []
    audio.isRecording = True


@eel.expose
def stopRecording():
    global soundMain, RECFILEPATH

    # check local host
    if isInLocalHost() == False: return

    if audio.isRecording == True:
        audio.isRecording = False
        audio.writeAudioData(None)
    
        # set audio to soundMain
        Sound = Sounds()
        # get recorded path
        RECFILEPATH = audio.getRecedFilePath()
        # set recorded file path to js
        js_SetRecordedFilePath(RECFILEPATH)
        # get array main sound data
        soundMain = Sound.getSound(RECFILEPATH)


""" plot audio analyzer """
@eel.expose
def preparePlotAudioData():
    # on heroku
    if commUtill.ON_HEROKU:
        commUtill.logger.debug("HEROKU env.")
        return False
    else:
        audio.allowCallback = True
        # create then start stream
        audio.openStream()

@eel.expose
def stopAudioCallback():
    # rec, callback stop
    if audio.isRecording == True:
        stopRecording()
    # stop callback
    audio.allowCallback = False #stop callback

@eel.expose
def getArrAudioInputs():
    return audio.getArrAudioInputs()

@eel.expose
def setAudioInputdevicesNumber(num):
    # stop stream
    stopAudioCallback()

    # set input device number
    audio.setAudioInputdevicesNumber(num)

    # start stream
    preparePlotAudioData()



""" get vars """
@eel.expose
def getGlobalVar(nType):
    """
    1:inputPath, 2:outputPath, 3:CHUNK, 4:CHANNELS, 5:RATE, 6:N, 7:RECFILEPATH, 8:nHop, 9:fSmooth, 10:fBalance
    """
    global inputPath, outputPath, CHUNK, CHANNELS, RATE, N, RECFILEPATH, nHop, fSmooth, fBalance, RECORD_SECONDS

    if nType == 1:
      return inputPath
    elif nType == 2:
      return outputPath
    elif nType == 3:
      return CHUNK
    elif nType == 4:
      return CHANNELS
    elif nType == 5:
      return RATE
    elif nType == 6:
      return N
    elif nType == 7:
      return RECFILEPATH
    elif nType == 8:
        return nHop
    elif nType == 9:
      return fSmooth
    elif nType == 10:
      return fBalance
    elif nType == 11:
      return RECORD_SECONDS


@eel.expose
def goMorphing():
    global soundMain, soundBase, RATE, N, nHop, fSmooth, fBalance, RECFILEPATH
    morphedPath4Web = ""

    #commUtill.logger.debug("now morphing")

    Sound = Sounds()

    # check sound file is set
    flg = checkSoundFileIsSet()
    if flg == False:
        return

    # on heroku
    if commUtill.ON_HEROKU:
        commUtill.logger.debug("get morphed file path ON HEROKU")
        FILE_NAME_HEROKU = 'finalized'
        EXTENSION = '.wav'
        path = outputPath + FILE_NAME_HEROKU + str(nSelectedSoundBase) + EXTENSION
        morphedPath4Web = path.replace(application_path+"/html", '', 1)
    
    # other normally
    else:
        # windowing
        win1 =  hanning(N)
        win2 =  hanning(N)

        # morphing
        Morph = Morphing()
        morphedPath = Morph.stftMorph(soundBase, soundMain, RATE, win1, N, win2, N, N // nHop, fSmooth, fBalance)
        # get array data
        soundMorph = Sound.getSound(morphedPath)
        doneSound = soundMorph

        # effect
        #soundEffected = reverb.mainProc(doneSound, RATE, 5, 0.05)
        #doneSound = soundEffected

        # Filter
        doneSound = IIRFilter.filterProc(doneSound, RATE, "lowpass", "butter", 3000.0)

        # write sound file in env
        #commUtill.logger.debug("write: " + morphedPath)
        #sf.write(morphedPath, doneSound, RATE)
        commUtill.writeSoundFile(morphedPath, doneSound, RATE)

        # retun path for web
        path = morphedPath
        morphedPath4Web = path.replace(application_path+"/html", '', 1)

    return morphedPath4Web


""" call js methods"""
# call js method
def js_AlertSoundFileIsUnset(arr):
    eel.alertSoundFileIsUnset(arr)

#def js_PlotAudioData(data):
#    eel.plotAudioData(data.tolist())

def js_SetRecordedFilePath(path):
    recFilePath4Web = path.replace(application_path+"/html", '', 1)
    commUtill.logger.debug(application_path + " * " + recFilePath4Web)
    eel.setRecordedFilePath(recFilePath4Web)


def js_MsgNotAllowRecording():
    eel.msgNotAllowRecording()


def makeEmptySoundArray():
    global soundBase, soundMain 
    soundBase = np.array([])
    soundMain = np.array([])


def checkSoundFileIsSet():
    global soundMain, soundBase
    arrCheckFlg = [True] * 2 # value:true *2row, [true,true]
    # no size, set false
    if soundBase.size == 0:
        # soundBase: 0
        arrCheckFlg[0] = False
    if soundMain.size == 0:
        # soundMain: 1
        arrCheckFlg[1] = False

    # check
    if arrCheckFlg[0] == True and arrCheckFlg[1] == True:
        #commUtill.logger.debug("No Error!!")
        return True
    else:
        js_AlertSoundFileIsUnset(arrCheckFlg)
        commUtill.logger.debug("Error, sound file is not set to js")
        return False



"""eel start"""
app_options = {}
if isInLocalHost() == True:
    # set option
    app_options = {
        #'mode': "chrome-app",
        'host': '127.0.0.1',
        'port': 8078
    }
else:
    if commUtill.ON_HEROKU:
        # get the heroku port
        port = int(os.environ.get('PORT', 17995))  # as per OP comments default is 17995
        # set options
        app_options = {
            #'mode': "chrome-app",
            'host': '0.0.0.0',
            'port': port
        }
    else:
        app_options = {
            'host': '0.0.0.0'
            #,'mode': "chrome-app"
        }

eel.btl.get('./index.html')
eel.start("index.html", options=app_options, size=(786, 689))
