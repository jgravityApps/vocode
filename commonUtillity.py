#!/usr/bin/ python3
# -*- coding: utf-8 -*-

import sys, os
import soundfile as sf
from logging import getLogger, StreamHandler, DEBUG

# available logg
logger = getLogger(__name__)
handler = StreamHandler()
handler.setLevel(DEBUG)
logger.setLevel(DEBUG)
logger.addHandler(handler)
logger.propagate = False

# heroku environment
ON_HEROKU = os.environ.get('ON_HEROKU')


application_path = os.getcwd()
if getattr(sys, 'frozen', False):
    application_path = os.path.dirname(sys.executable)
#elif __file__:
#    application_path = os.path.dirname(__file__)


# return real path
def getRightPath(filePathName):
    # get file path
    filename = filePathName.replace(application_path+"/" , '', 1)
    if hasattr(sys, '_MEIPASS'):
        filename = os.path.join(sys._MEIPASS, filename)
    elif '_MEIPASS2' in os.environ:
        filename = os.path.join(os.environ['_MEIPASS2'], filename)
    else:
        filename = os.path.join(os.path.dirname(sys.argv[0]), filename)
    return filename

# write sound file in os env
def writeSoundFile(path, y, rate):
    # get file path in env for writting file
    path4Writing = getRightPath(path)
    # write file
    sf.write(path4Writing, y, rate)
