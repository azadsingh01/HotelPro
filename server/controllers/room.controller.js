import { matchedData } from 'express-validator';
import {
  createRoomRecord,
  deleteRoomRecord,
  getActiveRoom,
  listManagedRooms,
  searchAvailableRooms,
  updateRoomRecord,
} from '../services/room.service.js';

export async function searchRooms(request, response) {
  const filters = matchedData(request, { locations: ['query'] });
  response.json(await searchAvailableRooms(filters, request.stayDates));
}

export async function getManagedRooms(_request, response) {
  response.json(await listManagedRooms());
}

export async function getRoom(request, response) {
  response.json(await getActiveRoom(request.params.id, request.stayDates));
}

export async function createRoom(request, response) {
  const values = matchedData(request, { locations: ['body'] });
  response.status(201).json(await createRoomRecord(values));
}

export async function updateRoom(request, response) {
  const values = matchedData(request, { locations: ['body'] });
  response.json(await updateRoomRecord(request.params.id, values));
}

export async function deleteRoom(request, response) {
  response.json(await deleteRoomRecord(request.params.id));
}
