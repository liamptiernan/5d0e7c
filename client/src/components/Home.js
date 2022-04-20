import React, { useCallback, useEffect, useState, useContext } from "react";
import axios from "axios";
import { useHistory } from "react-router-dom";
import { Grid, CssBaseline, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { SidebarContainer } from "../components/Sidebar";
import { ActiveChat } from "../components/ActiveChat";
import { SocketContext } from "../context/socket";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100vh",
  },
}));

const Home = ({ user, logout }) => {
  const history = useHistory();

  const socket = useContext(SocketContext);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  const classes = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const addSearchedUsers = (users) => {
    const currentUsers = {};

    // make table of current users so we can lookup faster
    conversations.forEach((convo) => {
      currentUsers[convo.otherUser.id] = true;
    });

    const newState = [...conversations];
    users.forEach((user) => {
      // only create a fake convo if we don't already have a convo with this user
      if (!currentUsers[user.id]) {
        let fakeConvo = { otherUser: user, messages: [] };
        newState.push(fakeConvo);
      }
    });

    setConversations(newState);
  };

  const clearSearchedUsers = () => {
    setConversations((prev) => prev.filter((convo) => convo.id));
  };

  const saveMessage = async (body) => {
    const { data } = await axios.post("/api/messages", body);
    return data;
  };

  const sendMessage = (data, body) => {
    socket.emit("new-message", {
      message: data.message,
      recipientId: body.recipientId,
      sender: data.sender,
    });
  };

  const postMessage = async (body) => {
    try {
      const data = await saveMessage(body);

      if (!body.conversationId) {
        addNewConvo(body.recipientId, data.message);
      } else {
        addMessageToConversation(data);
      }

      sendMessage(data, body);
    } catch (error) {
      console.error(error);
    }
  };

  const markMessagesRead = useCallback(async (conversationId, messages) => {
    const readMessageIds = messages.map(message => message.id);
    const readAt = new Date();

    const body = {
      conversationId,
      readAt,
      readMessages: readMessageIds
    }

    const { data } = await axios.post("/api/conversations", body);

    socket.emit("read-messages", { conversationId, readAt, readMessageIds: data.readMessageIds });
  }, [socket]);

  const updateReadMessages = useCallback((data) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.id === data.conversationId) {
          const convoCopy = { ...convo, messages: [ ...convo.messages ]}
          const newMessages = convoCopy.messages.map(message => {
            if (data.readMessageIds.includes(message.id)) {
              message.readAt = data.readAt;
            }
            return message;
          });

          convoCopy.messages = newMessages;
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, [setConversations]);

  const addNewConvo = useCallback(
    (recipientId, message) => {
      setConversations((prev) => {
        return prev.map((convo) => {
          const convoCopy = { ...convo, messages: [ ...convo.messages ]}

          if (convoCopy.otherUser.id === recipientId) {
            convoCopy.messages.push(message);
            convoCopy.latestMessageText = message.text;
            convoCopy.id = message.conversationId;
          }

          return convoCopy;
        });
      });
    },
    [setConversations],
  );

  const addMessageToConversation = useCallback(
    (data) => {
      // if sender isn't null, that means the message needs to be put in a brand new convo
      const { message, sender = null } = data;
      if (sender !== null) {
        const newConvo = {
          id: message.conversationId,
          otherUser: sender,
          messages: [message],
          unreadMessageCount: 1,
        };
        newConvo.latestMessageText = message.text;
        setConversations((prev) => [newConvo, ...prev]);
      }

      let readMessages = [];

      setConversations((prev) => {
        return prev.map((convo) => {
          const convoCopy = { ...convo, messages: [ ...convo.messages ]}

          if (convoCopy.id === message.conversationId) {
            convoCopy.messages.push(message);
            convoCopy.latestMessageText = message.text;

            if (message.senderId !== user.id) {
              if (activeConversation === convoCopy.otherUser.username) {
                readMessages.push(message);
              } else {
                convoCopy.unreadMessageCount++;
              }
            }
          }

          return convoCopy;
        });
      });

      if (readMessages.length > 0) {
        markMessagesRead(message.conversationId, readMessages);
      }
    },
    [activeConversation, markMessagesRead, setConversations, user.id],
  );

  const setActiveChat = (username) => {
    const conversation = conversations.find(conversation => {
      return conversation.otherUser.username === username;
    });

    let readMessages = conversation.messages.filter(message => {
      return !message.readAt && message.senderId !== user.id;
    });

    setConversations((prev) => {
      return prev.map((convo) => {
        const convoCopy = { ...convo, messages: [ ...convo.messages ]}

        if (convoCopy.id === conversation.id) {
          convoCopy.unreadMessageCount = 0;
        }

        return convoCopy;
      });
    });

    if (readMessages.length > 0) { markMessagesRead(conversation.id, readMessages); }
    setActiveConversation(username);
  };

  const addOnlineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: true };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, []);

  const removeOfflineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: false };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, []);

  // Lifecycle

  useEffect(() => {
    // Socket init
    socket.on("add-online-user", addOnlineUser);
    socket.on("remove-offline-user", removeOfflineUser);
    socket.on("new-message", addMessageToConversation);
    socket.on("read-messages", updateReadMessages);

    return () => {
      // before the component is destroyed
      // unbind all event handlers used in this component
      socket.off("add-online-user", addOnlineUser);
      socket.off("remove-offline-user", removeOfflineUser);
      socket.off("new-message", addMessageToConversation);
      socket.off("read-messages", updateReadMessages);
    };
  }, [addMessageToConversation, addOnlineUser, removeOfflineUser, socket, updateReadMessages]);

  useEffect(() => {
    // when fetching, prevent redirect
    if (user?.isFetching) return;

    if (user && user.id) {
      setIsLoggedIn(true);
    } else {
      // If we were previously logged in, redirect to login instead of register
      if (isLoggedIn) history.push("/login");
      else history.push("/register");
    }
  }, [user, history, isLoggedIn]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await axios.get("/api/conversations");
        setConversations(data);
      } catch (error) {
        console.error(error);
      }
    };
    if (!user.isFetching) {
      fetchConversations();
    }
  }, [user]);

  const handleLogout = async () => {
    if (user && user.id) {
      await logout(user.id);
    }
  };

  return (
    <>
      <Button onClick={handleLogout}>Logout</Button>
      <Grid container component="main" className={classes.root}>
        <CssBaseline />
        <SidebarContainer
          conversations={conversations}
          user={user}
          clearSearchedUsers={clearSearchedUsers}
          addSearchedUsers={addSearchedUsers}
          setActiveChat={setActiveChat}
        />
        <ActiveChat
          activeConversation={activeConversation}
          conversations={conversations}
          user={user}
          postMessage={postMessage}
        />
      </Grid>
    </>
  );
};

export default Home;
