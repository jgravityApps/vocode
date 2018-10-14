#!/usr/bin/ python3
# -*- coding: utf-8 -*-

import sys, os

application_path = os.getcwd()
if getattr(sys, 'frozen', False):
    application_path = os.path.dirname(sys.executable)
#elif __file__:
#    application_path = os.path.dirname(__file__)


# get google Ads tag
def getGAds(nType):
    tag = 'your code'
    return tag

# get google analytics tag
def getGAnalytics():
    tag = 'your code'
    return tag
