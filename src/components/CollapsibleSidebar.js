import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  Box,
  Typography,
  Avatar,
  styled
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';

/**
 * Styled components for the sidebar
 */
const SidebarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1.5),
  justifyContent: 'space-between',
  backgroundColor: '#FAF9F5',
  color: 'black',
}));

const StyledDrawer = styled(Drawer)(({ theme, open }) => ({
  width: open ? '240px' : '60px',
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: open ? '240px' : '60px',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    backgroundColor: '#FAF9F5',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    // Add this to make the right border thinner
    borderRight: '1px solid rgba(0, 0, 0, 0.08)', // Very thin, light border
  },
}));

const StyledListItemButton = styled(ListItemButton)(({ theme, selected }) => ({
  minHeight: 48,
  justifyContent: 'center',
  borderRadius: '8px',
  margin: '4px 8px',
  padding: theme.spacing(1, 2),
  backgroundColor: selected ? theme.palette.action.selected : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 32,
  height: 32,
  backgroundColor: '#8c8c89',
  color: theme.palette.primary.contrastText,
  fontSize: '0.8rem',
  fontWeight: 'bold',
}));

/**
 * CollapsibleSidebar - A beautiful collapsible sidebar component
 *
 * @param {boolean} open - Whether the sidebar is expanded or collapsed
 * @param {Function} onToggle - Callback function when toggle button is clicked
 * @param {string} title - The title displayed in the sidebar header
 * @param {Array} items - Array of item objects to display in the sidebar
 * @param {Object} selectedItem - The currently selected item
 * @param {Function} onItemClick - Callback function when an item is clicked
 * @param {Object} sx - Additional styles to apply to the component
 */
const CollapsibleSidebar = ({
  open = false,
  onToggle,
  title = "Sidebar",
  items = [],
  selectedItem = null,
  onItemClick,
  sx = {}
}) => {
  return (
      <StyledDrawer
          variant="permanent"
          anchor="left"
          open={open}
          sx={{
            ...sx
          }}
      >
        <SidebarHeader>
          {open && <Typography variant="h6" noWrap fontWeight="medium">{title}</Typography>}
          <IconButton
              onClick={onToggle}
              edge="end"
              color="inherit"
              aria-label={open ? 'collapse sidebar' : 'expand sidebar'}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        </SidebarHeader>


        <List sx={{
          flexGrow: 1,
          overflow: 'auto',
          padding: '8px 0'
        }}>
          {items.map((item) => (
              <ListItem
                  key={item.id}
                  disablePadding
                  sx={{ display: 'block' }}
              >
                <StyledListItemButton
                    selected={selectedItem?.id === item.id}
                    onClick={() => onItemClick && onItemClick(item)}
                    aria-label={`Select ${item.title}`}
                >
                  {open ? (
                      <ListItemText
                          style={{justifyContent: 'center'}}
                          primary={item.title}
                          secondary={item.subtitle}
                          primaryTypographyProps={{
                            noWrap: true,
                            style: {
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: selectedItem?.id === item.id ? 'bold' : 'normal'
                            }
                          }}
                          secondaryTypographyProps={{
                            noWrap: true,
                            style: {
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }
                          }}
                      />
                  ) : (
                      <StyledAvatar>
                        {item.title.charAt(0)}
                      </StyledAvatar>
                  )}
                </StyledListItemButton>
              </ListItem>
          ))}
        </List>
      </StyledDrawer>
  );
};

export default CollapsibleSidebar;
