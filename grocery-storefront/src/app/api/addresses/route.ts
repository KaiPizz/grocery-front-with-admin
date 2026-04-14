import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Local address storage — works around a backend bug where the
 * `customerAddressCreate` / `customerAddressUpdate` GraphQL mutations
 * reject all input fields with "property X should not exist".
 *
 * Addresses are stored in a JSON file in the `data/` directory,
 * keyed by customer ID (extracted from the JWT).
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const ADDRESSES_FILE = path.join(DATA_DIR, 'addresses.json');

interface StoredAddress {
  id: string;
  label?: string | null;
  isDefault: boolean;
  fullName: string;
  phone?: string | null;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  createdAt: string;
}

type AddressStore = Record<string, StoredAddress[]>;

/* ---------- helpers ---------- */

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): AddressStore {
  ensureDataDir();
  if (!fs.existsSync(ADDRESSES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(ADDRESSES_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeStore(store: AddressStore) {
  ensureDataDir();
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function extractCustomerId(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7);
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString('utf-8'),
    );
    return payload.sub || null;
  } catch {
    return null;
  }
}

function getCustomerAddresses(store: AddressStore, customerId: string): StoredAddress[] {
  return store[customerId] ?? [];
}

/* ---------- GET  /api/addresses ---------- */

export async function GET(request: NextRequest) {
  const customerId = extractCustomerId(request);
  if (!customerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = readStore();
  return NextResponse.json({ addresses: getCustomerAddresses(store, customerId) });
}

/* ---------- POST /api/addresses ---------- */

export async function POST(request: NextRequest) {
  const customerId = extractCustomerId(request);
  if (!customerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  const store = readStore();
  const addresses = getCustomerAddresses(store, customerId);

  switch (action) {
    case 'create': {
      const { input } = body;
      if (!input?.fullName || !input?.street || !input?.city || !input?.postalCode || !input?.country) {
        return NextResponse.json(
          { success: false, errors: ['fullName, street, city, postalCode, and country are required.'] },
          { status: 400 },
        );
      }

      const newAddress: StoredAddress = {
        id: randomUUID(),
        label: input.label || null,
        isDefault: addresses.length === 0, // first address becomes default
        fullName: input.fullName,
        phone: input.phone || null,
        street: input.street,
        city: input.city,
        postalCode: input.postalCode,
        country: input.country,
        createdAt: new Date().toISOString(),
      };

      addresses.push(newAddress);
      store[customerId] = addresses;
      writeStore(store);

      return NextResponse.json({ success: true, address: newAddress });
    }

    case 'update': {
      const { id, input } = body;
      const index = addresses.findIndex((a) => a.id === id);
      if (index === -1) {
        return NextResponse.json({ success: false, errors: ['Address not found.'] }, { status: 404 });
      }

      addresses[index] = {
        ...addresses[index],
        label: input.label ?? addresses[index].label,
        fullName: input.fullName ?? addresses[index].fullName,
        phone: input.phone ?? addresses[index].phone,
        street: input.street ?? addresses[index].street,
        city: input.city ?? addresses[index].city,
        postalCode: input.postalCode ?? addresses[index].postalCode,
        country: input.country ?? addresses[index].country,
      };

      store[customerId] = addresses;
      writeStore(store);

      return NextResponse.json({ success: true, address: addresses[index] });
    }

    case 'delete': {
      const { id } = body;
      const idx = addresses.findIndex((a) => a.id === id);
      if (idx === -1) {
        return NextResponse.json({ success: false, errors: ['Address not found.'] }, { status: 404 });
      }

      const wasDefault = addresses[idx].isDefault;
      addresses.splice(idx, 1);

      // If we deleted the default and there are remaining addresses, make the first one default
      if (wasDefault && addresses.length > 0) {
        addresses[0].isDefault = true;
      }

      store[customerId] = addresses;
      writeStore(store);

      return NextResponse.json({ success: true });
    }

    case 'setDefault': {
      const { id } = body;
      const target = addresses.find((a) => a.id === id);
      if (!target) {
        return NextResponse.json({ success: false, errors: ['Address not found.'] }, { status: 404 });
      }

      for (const addr of addresses) {
        addr.isDefault = addr.id === id;
      }

      store[customerId] = addresses;
      writeStore(store);

      return NextResponse.json({ success: true, address: target });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
