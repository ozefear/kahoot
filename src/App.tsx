/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import HostCreate from "./pages/HostCreate";
import HostLobby from "./pages/HostLobby";
import HostGame from "./pages/HostGame";
import PlayerLobby from "./pages/PlayerLobby";
import PlayerGame from "./pages/PlayerGame";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/create" element={<HostCreate />} />
        <Route path="/host/lobby/:pin" element={<HostLobby />} />
        <Route path="/host/game/:pin" element={<HostGame />} />
        <Route path="/player/lobby/:pin" element={<PlayerLobby />} />
        <Route path="/player/game/:pin" element={<PlayerGame />} />
      </Routes>
    </BrowserRouter>
  );
}
