import os

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'securederma',
        'USER': 'securederma_user',    
        'PASSWORD': 'securederma_pass',
        'HOST': 'localhost',
        'PORT': '5433',
    }
}