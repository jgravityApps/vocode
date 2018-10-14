#!/usr/bin/ python3
# -*- coding: utf-8 -*-

import sys, os
import math

def mainProc(data, fs, frames, fDTime=0.02, fDepth=0.002, fRate=0.3):
    """
    data: np array, fs: RATE, frames: number of frames, fDTime: 0.01-0.10, fDepth: 0.001-0.010, fRate: 0.1-1.0
    """
    d = fs * fDTime
    depth = fs * fDepth
    sound = [0 for i in range(frames)]
    for steps in range(1000, 3000, 500):
        sound = data
        for n in range(data.size):
            sound[n] = data[n]
            tau = d + depth * math.sin(2.0 * math.pi * fRate * (n +steps) / fs)
            t = (n +steps) - tau
            m = int(t)
            delta = t - m
            if m >= 0 and m + 1 < data.size:
                sound[n] += delta * data[m + 1] + (1.0 - delta) * data[m]
    return sound
