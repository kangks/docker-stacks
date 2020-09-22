FROM python:3.8.5-slim 

ENV DEBIAN_FRONTEND=noninteractive

ENV OPENCV_VERSION="4.4.0"
ENV PYTHON_VERSION="python3.8"

RUN apt-get update -y && apt-get upgrade -y
RUN apt-get install -y git build-essential cmake pkg-config

# Image I/O libs
RUN apt-get install -y libjpeg-dev libpng-dev libtiff-dev

# Video/Audio Libs - FFMPEG, GSTREAMER, x264 and so on.
RUN apt-get install -y libavcodec-dev libavformat-dev libswscale-dev libavresample-dev \
    libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
    libxvidcore-dev x264 libx264-dev libfaac-dev libmp3lame-dev libtheora-dev \
    libmp3lame-dev

# Cameras programming interface libs
# RUN apt-get install -y libdc1394-22 libdc1394-22-dev libxine2-dev libv4l-dev v4l-utils

#Parallelism library C++ for CPU
RUN apt-get install -y libtbb-dev libtbb2

# For libGL
RUN apt-get install -y libgl1-mesa-glx

WORKDIR /tmp

RUN git clone https://github.com/opencv/opencv.git && cd opencv && git checkout ${OPENCV_VERSION}

RUN git clone https://github.com/opencv/opencv_contrib.git && cd opencv_contrib && git checkout ${OPENCV_VERSION}

WORKDIR /tmp/opencv

RUN mkdir build

WORKDIR /tmp/opencv/build

RUN cmake -D CMAKE_BUILD_TYPE=RELEASE \
    -D BUILD_PROTOBUF=OFF \
    -D WITH_TBB=OFF \
    -D BUILD_TBB=OFF \
    -D WITH_V4L=ON \
    -D WITH_LIBV4L=OFF \
    -D WITH_GSTREAMER=ON \
    -D WITH_OPENGL=ON \
    -D WITH_OPENCL=ON \
    -D WITH_GTK=OFF \
    -D WITH_GTK_2_X=OFF \
    -D WITH_TBB=ON \
    -D WITH_EIGEN=ON \
    -D BUILD_TESTS=OFF \
    -D BUILD_opencv_gapi=OFF \
    -D BUILD_PERF_TESTS=OFF \
    -D BUILD_opencv_python3=ON \
    -D PYTHON_EXECUTABLE=`which ${PYTHON_VERSION}` \
    -D PYTHON3_PACKAGES_PATH=/usr/local/lib/${PYTHON_VERSION}/site-packages \
    -D OPENCV_EXTRA_MODULES_PATH=../../opencv_contrib/modules \
    -D CMAKE_INSTALL_PREFIX=/usr/local \
    ..

RUN make -j `$(grep -c processor /proc/cpuinfo)`

RUN rm -fr /tmp/opencv /tmp/opencv_contrib
