from django.db import models

from . import utils
from .user import User


class Conversation(utils.CustomModel):
    users = models.ManyToManyField(User)
    createdAt = models.DateTimeField(auto_now_add=True, db_index=True)
    updatedAt = models.DateTimeField(auto_now=True)

    # find conversation given user Ids
    def find_conversation(userIds):
        # return conversation or None if it doesn't exist
        try:
            return Conversation.objects.get(users__exact=userIds)
        except Conversation.DoesNotExist:
            return None
