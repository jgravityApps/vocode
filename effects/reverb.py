#!/usr/bin/ python3
# -*- coding: utf-8 -*-

import sys, os
import math

def mainProc(data, fs, nRepeat=5, fDTime=0.05):
    """
    data: np array, fs: RATE, nRepeat: 0-9, fTime: delay time 0.01-0.10
    """
    sound = [0.0 for i in range(data.size)]
    a = 0.5
    repeat = nRepeat

    d = fs * fDTime
    for i in range(data.size):
        sound[i] = data[i]
        for j in range(1, repeat + 1):
            m = int(i - j * d)
            if m >= 0:
                sound[i] += (a ** j) * data[m]

    return sound
