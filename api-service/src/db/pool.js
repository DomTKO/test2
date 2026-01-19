// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import mysql from "mysql2/promise";
import { DATABASE_URL } from "../config/env.js";

export const pool = mysql.createPool(DATABASE_URL);
