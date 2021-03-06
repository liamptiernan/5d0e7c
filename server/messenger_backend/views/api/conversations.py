from operator import attrgetter
from django.contrib.auth.middleware import get_user
from django.db.models import Max, Q
from django.db.models.query import Prefetch
from django.http import HttpResponse, JsonResponse
from messenger_backend.models import Conversation, Message
from online_users import online_users
from rest_framework.views import APIView
from rest_framework.request import Request


class Conversations(APIView):
    """get all conversations for a user, include latest message text for preview, and all messages
    include other user model so we have info on username/profile pic (don't include current user info)
    TODO: for scalability, implement lazy loading"""

    def get(self, request: Request):
        try:
            user = get_user(request)

            if user.is_anonymous:
                return HttpResponse(status=401)
            user_id = user.id

            conversations = (
                Conversation.objects.filter(Q(user1=user_id) | Q(user2=user_id))
                .prefetch_related(
                    Prefetch(
                        "messages", queryset=Message.objects.order_by("createdAt")
                    )
                )
                .all()
            )

            conversations_response = []

            for convo in conversations:
                convo_dict = {
                    "id": convo.id,
                    "messages": [
                        message.to_dict(["id", "text", "senderId", "readAt", "createdAt"])
                        for message in convo.messages.all()
                    ],
                }

                # set properties for notification count, latest message, and last read message in preview
                convo_dict["latestMessageText"] = convo_dict["messages"][-1]["text"]
                convo_dict["unreadMessageCount"] = sum(
                  message["readAt"] == None and message["senderId"] != user_id for message in convo_dict["messages"]
                )

                last_read_message = None

                for message in convo_dict["messages"]:
                    if message["readAt"] and message["senderId"] == user_id:
                        if not last_read_message or last_read_message["createdAt"] < message["createdAt"]:
                            last_read_message = message

                if last_read_message:
                    convo_dict["lastReadMessage"] = last_read_message["id"]
                else:
                    convo_dict["lastReadMessage"] = None

                # set a property "otherUser" so that frontend will have easier access
                user_fields = ["id", "username", "photoUrl"]
                if convo.user1 and convo.user1.id != user_id:
                    convo_dict["otherUser"] = convo.user1.to_dict(user_fields)
                elif convo.user2 and convo.user2.id != user_id:
                    convo_dict["otherUser"] = convo.user2.to_dict(user_fields)

                # set property for online status of the other user
                if convo_dict["otherUser"]["id"] in online_users:
                    convo_dict["otherUser"]["online"] = True
                else:
                    convo_dict["otherUser"]["online"] = False

                conversations_response.append(convo_dict)
            conversations_response.sort(
                key=lambda convo: convo["messages"][-1]["createdAt"],
                reverse=True,
            )
            return JsonResponse(
                conversations_response,
                safe=False,
            )
        except Exception as e:
            return HttpResponse(status=500)

    def patch(self, request: Request):
        try:
            user = get_user(request)

            if user.is_anonymous:
                return HttpResponse(status=401)
            user_id = user.id

            body = request.data
            conversation_id = body.get("conversationId")
            read_at = body.get("readAt")
            read_messages = body.get("readMessages")

            conversation = (
                Conversation.objects.filter(Q(id=conversation_id) & (Q(user1=user_id) | Q(user2=user_id)))
                .prefetch_related(
                    Prefetch(
                        "messages", queryset=Message.objects.filter(readAt=None)
                        .filter(id__in=read_messages)
                        .exclude(senderId=user_id)
                    )
                )
                .first()
            )

            if not conversation:
              return HttpResponse(status=403)

            messages_response = {
              "messages": []
            }

            for message in conversation.messages.all():
              message.readAt = read_at
              messages_response["messages"].append(message.to_dict())

            Message.objects.bulk_update(conversation.messages.all(), ['readAt'])

            messages_response["readMessageIds"] = read_messages

            return JsonResponse(
                messages_response,
                safe=False
            )
        except Exception as e:
            return HttpResponse(status=500)
