// src/components/GraphDrawer.js
import React, { useRef, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Chip, Drawer, IconButton,
  Divider, styled, Button, Badge, Tooltip, LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimelapseIcon from '@mui/icons-material/Timelapse';

const StyledDrawer = styled(Drawer)(({ theme, open }) => ({
  width: open ? '40%' : '0',
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: open ? '40%' : '0',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    borderLeft: '1px solid rgba(0, 0, 0, 0.08)', // Very thin, light border
  },
}));

// Status chip component
const StatusChip = ({ status }) => {
  let color;
  switch (status?.toLowerCase()) {
    case 'completed':
      color = 'success';
      break;
    case 'in_progress':
      color = 'primary';
      break;
    case 'failed':
      color = 'error';
      break;
    default:
      color = 'default';
  }

  return (
      <Chip
          label={status}
          color={color}
          size="small"
          sx={{ textTransform: 'capitalize' }}
      />
  );
};

const GraphDrawer = ({
  open,
  onClose,
  loading,
  error,
  chatData,
  onRefresh, // Optional prop for manual refresh
  updateCount = 0 // Optional prop to track updates
}) => {
  const svgRef = useRef(null);
  const drawerWidth = '60%'; // Set drawer width
  const [renderKey, setRenderKey] = useState(0); // Force re-render when needed

  // Define node dimensions
  const nodeWidth = 250;
  const nodeHeight = 80;

  // Force re-render on updateCount change
  useEffect(() => {
    // Force SVG re-render when updates occur
    setRenderKey(prev => prev + 1);
    console.log('GraphDrawer - Update detected:', updateCount);
  }, [updateCount, chatData]);

  // Calculate node positions for the graph
  const calculateNodePositions = (tasks) => {
    if (!tasks || tasks.length === 0) {
      console.log('No tasks provided to calculateNodePositions');
      return [];
    }

    console.log('Calculating positions for tasks:', tasks);

    // Group tasks by their level (determined by dependencies)
    const taskMap = {};
    tasks.forEach(task => {
      taskMap[task.task_id] = { ...task, level: 0, processed: false };
    });

    // Calculate the level for each task based on dependencies
    const calculateLevels = () => {
      let changed = false;

      tasks.forEach(task => {
        if (task.dependencies && task.dependencies.length > 0) {
          let maxLevel = 0;

          task.dependencies.forEach(depId => {
            if (taskMap[depId] && taskMap[depId].level > maxLevel) {
              maxLevel = taskMap[depId].level;
            }
          });

          const newLevel = maxLevel + 1;
          if (taskMap[task.task_id].level !== newLevel) {
            taskMap[task.task_id].level = newLevel;
            changed = true;
          }
        }
      });

      return changed;
    };

    // Continue calculating levels until no more changes
    while (calculateLevels()) {}

    // Determine max level and count tasks per level
    let maxLevel = 0;
    const tasksPerLevel = {};

    Object.values(taskMap).forEach(task => {
      if (task.level > maxLevel) maxLevel = task.level;

      if (!tasksPerLevel[task.level]) {
        tasksPerLevel[task.level] = 0;
      }
      tasksPerLevel[task.level]++;
    });

    // Calculate x and y positions for each node (vertical layout)
    const nodePositions = [];
    const nodeSpacing = 30;
    const levelHeight = 150;

    Object.values(taskMap).forEach(task => {
      const levelTasks = tasksPerLevel[task.level];

      // Find position within level
      let positionInLevel = 0;
      for (const t of Object.values(taskMap)) {
        if (t.task_id === task.task_id) break;
        if (t.level === task.level) positionInLevel++;
      }

      // For vertical layout (top to bottom):
      // y depends on level, x depends on position within level
      const totalLevelWidth = (levelTasks * nodeWidth) + ((levelTasks - 1) * nodeSpacing);
      const startX = Math.max(50, (800 - totalLevelWidth) / 2); // Ensure minimum left margin

      const y = task.level * levelHeight + 50;
      const x = startX + positionInLevel * (nodeWidth + nodeSpacing);

      nodePositions.push({
        ...task,
        x,
        y
      });
    });

    console.log('Calculated node positions:', nodePositions);
    return nodePositions;
  };

  // Calculate the nodes and edges for the graph
  const nodes = chatData?.plan?.tasks ? calculateNodePositions(chatData.plan.tasks) : [];

  // Get total graph dimensions
  const graphWidth = Math.max(800, nodes.length ? Math.max(...nodes.map(n => n.x + nodeWidth)) + 50 : 800);
  const graphHeight = Math.max(600, nodes.length ? Math.max(...nodes.map(n => n.y + nodeHeight)) + 100 : 600);

  // Generate node fill color based on status
  const getNodeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#2e7d32'; // green
      case 'in_progress': return '#1976d2'; // blue
      case 'pending': return '#9e9e9e'; // gray
      case 'failed': return '#d32f2f'; // red
      default: return '#9e9e9e';
    }
  };

  // Format timestamp if present
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return null;
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (e) {
      return timestamp;
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!chatData?.plan?.progress) return null;

    const { completed_tasks, total_tasks } = chatData.plan.progress;
    if (total_tasks === 0) return 0;

    return Math.round((completed_tasks / total_tasks) * 100);
  };

  // Get the last update time
  const getLastUpdateTime = () => {
    if (!chatData?.plan?.last_updated) return 'Unknown';
    return formatTimestamp(chatData.plan.last_updated);
  };

  return (
      <StyledDrawer
          variant="permanent"
          anchor="right"
          open={open}
      >
        {open && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, justifyContent: 'space-between' }}>
                <Typography variant="h6">
                  Task Plan Visualization
                </Typography>
                <Box>
                  {onRefresh && (
                      <Tooltip title="Refresh data">
                        <IconButton onClick={onRefresh} sx={{ mr: 1 }}>
                          <RefreshIcon />
                        </IconButton>
                      </Tooltip>
                  )}
                  <IconButton onClick={onClose} edge="end">
                    <CloseIcon />
                  </IconButton>
                </Box>
              </Box>
              <Divider />

              <Box sx={{ p: 2, overflow: 'auto' }}>
                {loading && !chatData?.plan?.tasks && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%' }}>
                      <CircularProgress />
                      <Typography variant="body1" sx={{ ml: 2 }}>
                        Processing your query...
                      </Typography>
                    </Box>
                )}

                {error && (
                    <Paper sx={{ p: 2, bgcolor: '#ffebee', color: '#d32f2f', mb: 2 }}>
                      <Typography variant="body2">{error}</Typography>
                    </Paper>
                )}

                {chatData && (
                    <Paper sx={{ p: 2, mb: 3 }} elevation={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ mr: 1 }}>
                            Status:
                          </Typography>
                          <StatusChip status={chatData.status} />
                        </Box>

                        {updateCount > 0 && (
                            <Tooltip title={`Last updated: ${getLastUpdateTime()}`}>
                              <Badge badgeContent={updateCount} color="primary" max={99}>
                                <TimelapseIcon color="action" />
                              </Badge>
                            </Tooltip>
                        )}
                      </Box>

                      {chatData.plan?.progress && (
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2">
                                Progress: {chatData.plan.progress.completed_tasks} / {chatData.plan.progress.total_tasks} tasks
                              </Typography>
                              <Typography variant="body2">
                                {getProgressPercentage()}%
                              </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={getProgressPercentage() || 0}
                                sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                      )}

                      {chatData.result && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2">Result:</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {chatData.result}
                            </Typography>
                          </Box>
                      )}
                    </Paper>
                )}

                {chatData?.plan?.tasks && (
                    <Box sx={{ overflow: 'auto', border: '1px solid #eee', borderRadius: 1, p: 1, mb: 2 }}>
                      <svg
                          width={graphWidth}
                          height={graphHeight}
                          ref={svgRef}
                          key={`svg-${renderKey}`}
                      >
                        {/* Background grid for better visualization */}
                        <defs>
                          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f3f3f3" strokeWidth="1"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />

                        {/* Draw edges first so they're underneath nodes */}
                        {nodes.map(node =>
                                node.dependencies && node.dependencies.map(depId => {
                                  const sourceNode = nodes.find(n => n.task_id === depId);
                                  if (!sourceNode) {
                                    console.log(`Edge source not found: ${depId} -> ${node.task_id}`);
                                    return null;
                                  }

                                  console.log(`Drawing edge: ${depId} -> ${node.task_id}`);

                                  // Calculate connection points - from bottom of source to top of target
                                  const startX = sourceNode.x + nodeWidth / 2;
                                  const startY = sourceNode.y + nodeHeight;
                                  const endX = node.x + nodeWidth / 2;
                                  const endY = node.y;

                                  // Create a path for the curved line
                                  // Using bezier curve for a nice arc
                                  const midY = (startY + endY) / 2;
                                  const path = `M${startX},${startY} C${startX},${midY} ${endX},${midY} ${endX},${endY}`;

                                  const edgeColor = node.execution_status === 'pending' ? '#bdbdbd' : '#42a5f5';

                                  return (
                                      <g key={`edge-${depId}-${node.task_id}`} className="task-edge">
                                        {/* Main connection line */}
                                        <path
                                            d={path}
                                            fill="none"
                                            stroke={edgeColor}
                                            strokeWidth={2}
                                            markerEnd="url(#arrowhead)"
                                        />
                                        {/* Arrow head */}
                                        <polygon
                                            points={`${endX},${endY} ${endX-5},${endY-10} ${endX+5},${endY-10}`}
                                            fill={edgeColor}
                                        />
                                      </g>
                                  );
                                })
                        )}

                        {/* Draw nodes */}
                        {nodes.map(node => (
                            <g key={`node-${node.task_id}`} className="task-node">
                              {/* Node shadow for depth effect */}
                              <rect
                                  x={node.x + 3}
                                  y={node.y + 3}
                                  width={nodeWidth}
                                  height={nodeHeight}
                                  rx={4}
                                  fill="rgba(0,0,0,0.1)"
                              />

                              {/* Node background */}
                              <rect
                                  x={node.x}
                                  y={node.y}
                                  width={nodeWidth}
                                  height={nodeHeight}
                                  rx={4}
                                  fill={getNodeColor(node.execution_status)}
                                  stroke="#fff"
                                  strokeWidth={1}
                              />

                              {/* Task ID */}
                              <text
                                  x={node.x + 10}
                                  y={node.y + 20}
                                  fill="white"
                                  fontSize="12"
                                  fontWeight="bold"
                              >
                                {node.task_id} ({node.task_type})
                              </text>

                              {/* Task description */}
                              <foreignObject
                                  x={node.x + 10}
                                  y={node.y + 25}
                                  width={nodeWidth - 20}
                                  height={nodeHeight - 35}
                              >
                                <div xmlns="http://www.w3.org/1999/xhtml" style={{
                                  color: 'white',
                                  fontSize: '12px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxHeight: '100%'
                                }}>
                                  {node.task_description}
                                </div>
                              </foreignObject>

                              {/* Progress indicator for in_progress tasks */}
                              {node.execution_status === 'in_progress' && (
                                  <rect
                                      x={node.x}
                                      y={node.y + nodeHeight - 5}
                                      width={nodeWidth * (node.progress_percentage ? node.progress_percentage / 100 : 0.5)}
                                      height={5}
                                      fill="#ffb74d"
                                  />
                              )}
                            </g>
                        ))}
                      </svg>
                    </Box>
                )}

                {/* Show a message if no tasks are available */}
                {!loading && (!chatData?.plan?.tasks || chatData.plan.tasks.length === 0) && (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                      <Typography variant="body1" color="text.secondary">
                        No task plan available yet.
                      </Typography>
                      {onRefresh && (
                          <Button
                              variant="outlined"
                              startIcon={<RefreshIcon />}
                              onClick={onRefresh}
                              sx={{ mt: 2 }}
                          >
                            Refresh
                          </Button>
                      )}
                    </Box>
                )}
              </Box>
            </Box>
        )}
      </StyledDrawer>
  );
};

export default GraphDrawer;
