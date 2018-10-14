FROM vocode-app:0.9.1_image

# Add our code
COPY ./ /your-dir/
WORKDIR /your-dir/

# for websocket
CMD python main.py runserver 0.0.0.0:$PORT
