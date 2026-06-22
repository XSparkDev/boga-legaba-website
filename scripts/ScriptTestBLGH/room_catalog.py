"""
Known Boga Legaba rooms → property metadata (matches data/rooms.ts).
Used to enrich NightsBridge room rows when syncing to Supabase.
"""

from __future__ import annotations

ROOM_CATALOG: dict[str, dict[str, str]] = {
    # Chababa — 8 Interlaken
    "Beads": {"property_name": "Chababa", "address": "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Double", "bathroom_type": "Bath only"},
    "Blue Clouds": {"property_name": "Chababa", "address": "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Twin", "bathroom_type": "Bath & Shower"},
    "Flutes": {"property_name": "Chababa", "address": "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Twin", "bathroom_type": "Shower only"},
    "Hunters": {"property_name": "Chababa", "address": "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Double", "bathroom_type": "Shower only"},
    "Huts": {"property_name": "Chababa", "address": "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Double", "bathroom_type": "Shower only"},
    "Letimela": {"property_name": "Chababa", "address": "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Family", "bathroom_type": "Bath & Shower"},
    "Modjadji": {"property_name": "Chababa", "address": "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Double", "bathroom_type": "Shower only"},
    "Queens": {"property_name": "Chababa", "address": "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Double", "bathroom_type": "Shower only"},
    "Reeds": {"property_name": "Chababa", "address": "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Double", "bathroom_type": "Bath & Shower"},
    "Spears": {"property_name": "Chababa", "address": "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Twin", "bathroom_type": "Shower only"},
    # Interlaken A — 6 Interlaken
    "A Mulher Africana": {"property_name": "Interlaken A", "address": "6 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Family", "bathroom_type": "Shower only"},
    "Blue Sea": {"property_name": "Interlaken A", "address": "6 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Twin", "bathroom_type": "Shower only"},
    "Red Room": {"property_name": "Interlaken A", "address": "6 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Double", "bathroom_type": "Bath only"},
    "Calabash": {"property_name": "Interlaken A", "address": "6 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Double", "bathroom_type": "Bath & Shower"},
    "Segametsi": {"property_name": "Interlaken A", "address": "6 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Family", "bathroom_type": "Shower only"},
    "Squater Comfort": {"property_name": "Interlaken A", "address": "6 Interlaken Avenue, Riviera Park, Mahikeng, 2745", "configuration": "Triple", "bathroom_type": "Shower only"},
    # Lantana — 10 Lantana
    "Modiga": {"property_name": "Lantana", "address": "10 Lantana Street, Mahikeng", "configuration": "TBC", "bathroom_type": "TBC"},
    "Mojamorago": {"property_name": "Lantana", "address": "10 Lantana Street, Mahikeng", "configuration": "TBC", "bathroom_type": "TBC"},
    "Mophato": {"property_name": "Lantana", "address": "10 Lantana Street, Mahikeng", "configuration": "TBC", "bathroom_type": "TBC"},
    "Motswakgomo": {"property_name": "Lantana", "address": "10 Lantana Street, Mahikeng", "configuration": "TBC", "bathroom_type": "TBC"},
    "Lantana Room 5": {"property_name": "Lantana", "address": "10 Lantana Street, Mahikeng", "configuration": "TBC", "bathroom_type": "TBC"},
    "Lantana Room 6": {"property_name": "Lantana", "address": "10 Lantana Street, Mahikeng", "configuration": "TBC", "bathroom_type": "TBC"},
    "Lantana Room 7": {"property_name": "Lantana", "address": "10 Lantana Street, Mahikeng", "configuration": "TBC", "bathroom_type": "TBC"},
    # Transnet Portfolio
    "Lokomotief": {"property_name": "Transnet Portfolio", "address": "Mahikeng — address confirmed at booking", "configuration": "TBC", "bathroom_type": "TBC"},
    "Mjantshi": {"property_name": "Transnet Portfolio", "address": "Mahikeng — address confirmed at booking", "configuration": "TBC", "bathroom_type": "TBC"},
    "Shosholoza": {"property_name": "Transnet Portfolio", "address": "Mahikeng — address confirmed at booking", "configuration": "TBC", "bathroom_type": "TBC"},
    "Stimela": {"property_name": "Transnet Portfolio", "address": "Mahikeng — address confirmed at booking", "configuration": "TBC", "bathroom_type": "TBC"},
}


def enrich_room(room_name: str) -> dict[str, str | None]:
    meta = ROOM_CATALOG.get(room_name, {})
    return {
        "property_name": meta.get("property_name"),
        "address": meta.get("address"),
        "configuration": meta.get("configuration"),
        "bathroom_type": meta.get("bathroom_type"),
    }
