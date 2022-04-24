import React from 'react';
import { Box, Chip } from '@material-ui/core';
import { BadgeAvatar, ChatContent } from '../Sidebar';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root: {
    borderRadius: 8,
    height: 80,
    boxShadow: '0 2px 10px 0 rgba(88,133,196,0.05)',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    '&:hover': {
      cursor: 'grab',
    },
  },
  unread: {
    fontSize: 10,
    fontWeight: 'bold',
    height: 20,
    marginRight: 20,
  }
}));

const Chat = ({ conversation, setActiveChat }) => {
  const classes = useStyles();
  const { otherUser } = conversation;

  const handleClick = async (conversation) => {
    await setActiveChat(conversation.otherUser.username);
  };

  const isUnread = conversation.unreadMessageCount > 0;

  return (
    <Box onClick={() => handleClick(conversation)} className={classes.root}>
      <BadgeAvatar
        photoUrl={otherUser.photoUrl}
        username={otherUser.username}
        online={otherUser.online}
        sidebar={true}
      />
      <ChatContent
        conversation={conversation}
        isUnread={isUnread}
      />
      {isUnread && <Chip
        className={classes.unread}
        color="primary"
        label={conversation.unreadMessageCount}
        size="small"
      />}
    </Box>
  );
};

export default Chat;
