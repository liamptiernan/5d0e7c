import React from 'react';
import { Box } from '@material-ui/core';
import { SenderBubble, OtherUserBubble } from '.';
import moment from 'moment';

const Messages = (props) => {
  const { messages, otherUser, userId } = props;

  let lastRead;

  for (const message of messages) {
    if (message.readAt && message.senderId === userId) {
      if (!lastRead || lastRead.createdAt < message.createdAt) {
        lastRead = message;
      }
    }
  }

  return (
    <Box>
      {messages.map((message) => {
        const time = moment(message.createdAt).format('h:mm');
        let isLastRead = false;
        if (lastRead && lastRead.id === message.id) {
          isLastRead = true;
        }

        return message.senderId === userId ? (
          <SenderBubble 
            key={message.id}
            isLastRead={isLastRead}
            otherUser={otherUser}
            text={message.text}
            time={time}
          />
        ) : (
          <OtherUserBubble
            key={message.id}
            text={message.text}
            time={time}
            otherUser={otherUser}
          />
        );
      })}
    </Box>
  );
};

export default Messages;
