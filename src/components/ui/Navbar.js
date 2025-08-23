import React, { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, useMediaQuery, useTheme, Menu, MenuItem, Avatar } from '@mui/material';
import { FaHome, FaSearch, FaList, FaCog, FaBars, FaUser } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import UserProfile from '../auth/UserProfile';
import GoogleAuthButton from '../auth/GoogleAuthButton';

const Navbar = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const navItems = [
    { text: '首頁', icon: <FaHome />, path: '/' },
    { text: '搜尋', icon: <FaSearch />, path: '/search' },
    { text: '播放清單', icon: <FaList />, path: '/playlists' },
    { text: '設置', icon: <FaCog />, path: '/settings' },
  ];

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        {navItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            component={RouterLink} 
            to={item.path}
            selected={isActive(item.path)}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer(true)}
            sx={{ mr: 2 }}
          >
            <FaBars />
          </IconButton>
        )}
        
        <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
          Youtuber No AD
        </Typography>
        
        {!isMobile && navItems.map((item) => (
          <Button
            key={item.text}
            component={RouterLink}
            to={item.path}
            color="inherit"
            startIcon={item.icon}
            sx={{ 
              mx: 1,
              fontWeight: isActive(item.path) ? 'bold' : 'normal',
              borderBottom: isActive(item.path) ? '2px solid' : 'none',
            }}
          >
            {item.text}
          </Button>
        ))}
        
        {isAuthenticated && user ? (
          <>
            <IconButton onClick={handleProfileClick} color="inherit">
              {user.picture ? (
                <Avatar src={user.picture} alt={user.name} sx={{ width: 32, height: 32 }} />
              ) : (
                <FaUser />
              )}
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <UserProfile />
            </Menu>
          </>
        ) : (
          <GoogleAuthButton />
        )}
      </Toolbar>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
};

export default Navbar;