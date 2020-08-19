import { Graph, GraphNode } from '../../types';
import { GraphAction } from '../actions';
import { graphConstants } from '../../constants';


interface GraphState {
  data: Graph;
  idToNode: Record<string, GraphNode>;
  isLoading: boolean;
  isUpdating: boolean;
  neighbours: Record<string, Set<GraphNode>>;
}

const initialState: GraphState = {
  data: {
    nodes: [],
    links: [],
    nodeSequence: 0,
  },
  idToNode: {},
  isLoading: false,
  isUpdating: false,
  neighbours: {},
};

export default (state = initialState, action: GraphAction): GraphState => {
  let nextState = {...state};

  switch(action.type) {

    case graphConstants.ADD_LINK:
      nextState.data.links.push(action.link);
      // Add each node to the other's neighbours list
      let [nodeA, nodeB] = nextState.data.nodes.filter(node => node.id === action.link.source || node.id === action.link.target);
      nextState.neighbours![nodeA.id!].add(nodeB);
      nextState.neighbours![nodeB.id!].add(nodeA);
      // If they are both group nodes, only update the target as it is the sub-group
      if (nodeA.isGroup && nodeB.isGroup) {
        let targetNode = nodeA.id === action.link.target ? nodeA : nodeB;
        targetNode.groups!.push(nodeA.id === action.link.source ? nodeA.id as string: nodeB.id as string);
      }
      else {
        if (nodeA.isGroup) nodeB.groups!.push(nodeA.id as string);
        else if (nodeB.isGroup) nodeA.groups!.push(nodeB.id as string);
      }
      return nextState;

    case graphConstants.ADD_NODE:
      return {
        ...state,
        data: {
          ...state.data,
          nodes: [...state.data.nodes, action.node],
          nodeSequence: state.data.nodeSequence! + 1,
        },
        idToNode: {...state.idToNode, [action.node.id!]: action.node},
        neighbours: {...state.neighbours, [action.node.id!]: new Set<GraphNode>()}
      };

    case graphConstants.DELETE_NODE:
      let toDeleteNode = action.node;
      // Delete the node from the nodes list
      nextState.data.nodes = state.data.nodes.filter(n => n !== toDeleteNode);
      // Go through its neighbours, removing it from their groups and neighbours list
      let neighbours = state.neighbours![toDeleteNode.id!];
      neighbours.forEach(neighbour => {
        nextState.neighbours![neighbour.id!].delete(toDeleteNode);
        neighbour.groups = neighbour.groups!.filter(groupId => groupId !== toDeleteNode.id);
      });
      // Delete all links involving the node
      nextState.data.links = state.data.links.filter(link => link.source !== toDeleteNode && link.target !== toDeleteNode);
      // Delete its index
      delete nextState.idToNode[toDeleteNode.id!];
      return nextState;

    case graphConstants.GET_GRAPH_BEGIN:
      return {
        ...state,
        isLoading: true
      };
    
    case graphConstants.GET_GRAPH_FAILURE:
      return {
        ...state,
        isLoading: false
      };
    
    case graphConstants.GET_GRAPH_SUCCESS:
      nextState.data = action.graph;
      // Create the node index
      for (let node of nextState.data.nodes) {
        nextState.idToNode[node.id!] = node;
      }
      // Create the adjacency list (currently all undirected links)
      for (let link of nextState.data.links) {
        nextState.neighbours[link.source as string].add(nextState.idToNode[link.target as string]);  
        nextState.neighbours[link.target as string].add(nextState.idToNode[link.source as string]);
      }
      return {
        ...nextState,
        isLoading: false,
      };

    case graphConstants.UPDATE_GRAPH_BEGIN:
      return {
        ...state,
        isUpdating: true
      };

    case graphConstants.UPDATE_GRAPH_FAILURE:
      return {
        ...state,
        isUpdating: false
      };

    case graphConstants.UPDATE_GRAPH_SUCCESS:
      return {
        ...state,
        data: action.graph,
        isUpdating: false,
      };

    case graphConstants.UPDATE_NODE:
      return {
        ...state,
        data: {
          ...state.data,
          nodes: state.data.nodes.map(node => node.id === action.node.id ? action.node : node)
        }
      };

    default:
      return state;
  }
};
