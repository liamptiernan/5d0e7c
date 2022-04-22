from django.db import models

from . import utils
from .message import Message
from .user import User


class Reads(utils.CustomModel):
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    readAt = models.DateTimeField(null=False)