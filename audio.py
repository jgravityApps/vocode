#!/usr/bin/ python3
# -*- coding: utf-8 -*-

import pyaudio
import wave
import time, sys, os
import soundfile as sf
import numpy as np
#import eel

application_path = os.getcwd()

if getattr(sys, 'frozen', False):
    application_path = os.path.dirname(sys.executable)
#elif __file__:
#    application_path = os.path.dirname(__file__)

sys.path.append(os.path.join(os.path.dirname(os.path.realpath(sys.argv[0])), application_path))
import commonUtillity as commUtill
import customEel as eel

# global vars
recPath = application_path + "/html/sounds/rec/" #os.path.expanduser("~/Desktop/") #application_path + "/sounds/rec/"
recFileName = "reced"
RECFILENAME = recPath + recFileName + ".wav"
CHUNK = 1024
CHANNELS = 1
RATE = 44100
N = 1024
pAudio = pyaudio.PyAudio() #for rec
allowCallback = True
isRecording = False
audioFrames = [] #for writing
arrInputs = {}
arrInputs[0] = {}
nInputDevice = 0

in_stream = set()


""" Audio Stream """
def openStream():
    global pAudio, nInputDevice, in_stream

    # stop then terminate py audio
    try:
        stopStream(pAudio)
    except:
        pass
    try:
        #commUtill.logger.debug("terminate paudio")
        pAudio.terminate()
    except:
        pass

    # set audio stream
    pAudio = pyaudio.PyAudio()
    py_format = pAudio.get_format_from_width(2)
    use_device_index = nInputDevice
    in_stream = pAudio.open(
                            #PA_manager = pAudio,
                            format=py_format,
                            channels=CHANNELS,
                            rate=RATE,
                            input=True,
                            #output = True,
                            frames_per_buffer=CHUNK,
                            input_device_index=use_device_index,
                            stream_callback=callback)
    in_stream.start_stream()


""" get Audio Input devices """
def getArrAudioInputs():
    global pAudio, arrInputs
    
    # list available input devices up
    #commUtill.logger.debug ("device num: {0}".format(pAudio.get_device_count()))
    arrInputs = {}
    arrInputs[0] = {}
    for i in range(pAudio.get_device_count()):
        inputDevice = pAudio.get_device_info_by_index(i) #devices
        #commUtill.logger.debug(pAudio.get_device_info_by_index(i))
        maxInputCh = inputDevice.get("maxInputChannels") #get number of input ch
        #commUtill.logger.debug(maxInputCh)
        if maxInputCh > 0:
            arrInputs[i]  = inputDevice #this is input. apend it to array
            #commUtill.logger.debug(inputDevice)
    return arrInputs

""" set Audio Input device number """
def setAudioInputdevicesNumber(num):
    global nInputDevice
    nInputDevice = int(num)


""" Callback """
def callback(in_data, frame_count, time_info, status):
    global isRecording, audioFrames

    if allowCallback == True:
        #commUtill.logger.debug("callback!")
        in_float = np.frombuffer(in_data, dtype=np.int8).astype(np.float)
        in_float[in_float > 0.0] /= float(2**15 - 1)
        in_float[in_float <= 0.0] /= float(2**15)
        #xs = np.r_[xs, in_float]
        # audio data to js method
        js_PlotAudioData(in_float)

        # append audio data
        if isRecording == True:
            audioFrames.append(np.fromstring(in_data, dtype=np.int16))

        return (in_data, pyaudio.paContinue)
    else:
        #commUtill.logger.debug("stop callback!")
        # stop stream with pyaudio instance
        stopStream(pAudio)
        return (in_data, pyaudio.paAbort)

def stopStream(pAudioInstance):
    global in_stream
    #commUtill.logger.debug("stop Stream")
    in_stream.stop_stream()
    #in_stream.close()



""" write audio data """
def writeAudioData(data):
    global isRecording, audioFrames

    try:
        # convert numpy array
        numpydata = np.hstack(audioFrames)

        # write audio data #sf.write(RECFILENAME, numpydata, RATE)
        commUtill.writeSoundFile(RECFILENAME, numpydata, RATE)
        #commUtill.logger.debug("■ wrote audio data")
    except:
        commUtill.logger.debug("Error, audio writing")
        pass


def getRecedFilePath():
    global RECFILENAME
    if RECFILENAME == "":
        commUtill.logger.debug("Error, RECFILENAME empty")
    #commUtill.logger.debug(RECFILENAME)
    return RECFILENAME


""" eel js methods """
def js_PlotAudioData(data):
    eel.plotAudioData(data.tolist())

