#!/usr/bin/ python3
# -*- coding: utf-8 -*-

import sys, os
import math
from scipy import signal
from scipy.signal import lfilter, freqz

def filterProc(data, fs, type, ftype="butter", cutFreq=2500.0):
    """
    data: sound array
    rate: RATE(fs)
    type: 'bandpass', 'lowpass', 'highpass', 'bandstop'
    ftype: Butterworth: 'butter', ChebyshevI: 'cheby1', ChebyshevII: 'cheby2', Cauer/elliptic: 'ellip', Bessel/Thomson: 'bessel'
    """
    nyq = fs / 2.0  # nyquist freq
    fc = cutFreq / nyq # cut off freq
    
    # IIR Filtering
    b, a = signal.iirfilter(3, fc, btype = type, analog = False, ftype = ftype, output = 'ba')
    sound = lfilter(b, a, data)   #x:input，y:output, b,a:filter coefficient
    
    return sound
