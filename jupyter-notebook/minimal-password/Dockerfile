ARG BASE_CONTAINER=jupyter/minimal-notebook
FROM $BASE_CONTAINER

# RUN cp /etc/jupyter/jupyter_notebook_config.py /home/jovyan/.jupyter/jupyter_notebook_config_original.py
# as per https://jupyter-notebook.readthedocs.io/en/stable/public_server.html#adding-hashed-password-to-your-notebook-configuration-file
COPY jupyter_notebook_config.py /home/jovyan/.jupyter/jupyter_notebook_config.py
