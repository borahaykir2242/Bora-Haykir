
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

interface GroundingResource {
  title: string;
  uri: string;
  snippet?: string;
}

interface PitchDiscoverProps {
  onAddPitch: (pitch: { name: string; contact: { notes: string } }) => Promise<void>;
}

const PitchDiscover: React.FC<PitchDiscoverProps> = ({ onAddPitch }) => {
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [pitches, setPitches] = useState<GroundingResource[]>([]);

  const discoverNearby = async () => {
    setLoading(true);
    setPitches([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let lat = 41.0082; // Default Istanbul
      let lng = 28.9784;

      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        ).catch(() => null);
        
        if (pos) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Find 5 highly-rated soccer/football pitches or 'halı saha' nearby. Provide their names and brief descriptions.",
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng
              }
            }
          }
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const discovered: GroundingResource[] = [];

      chunks.forEach((chunk: any) => {
        if (chunk.maps) {
          discovered.push({
            title: chunk.maps.title || "Soccer Pitch",
            uri: chunk.maps.uri,
            snippet: chunk.maps.placeAnswerSources?.[0]?.reviewSnippets?.[0]
          });
        }
      });

      setPitches(discovered);
    } catch (error) {
      console.error("Discovery failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (p: GroundingResource) => {
    setAddingId(p.uri);
    try {
      await onAddPitch({ 
        name: p.title, 
        contact: { notes: `Source: Google Maps - ${p.uri}${p.snippet ? ` | Description: ${p.snippet}` : ''}` }
      });
    } catch (e) {
      console.error("Failed to add AI pitch", e);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black italic text-sunNavy uppercase tracking-tighter">AI Pitch Discovery</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Smart Search via Google Maps</p>
        </div>
        <button 
          onClick={discoverNearby}
          disabled={loading}
          className="bg-sunNavy text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all uppercase tracking-widest italic disabled:opacity-50 flex items-center gap-3"
        >
          {loading ? (
            <><i className="fas fa-spinner animate-spin"></i> SCANNING AREA...</>
          ) : (
            <><i className="fas fa-search-location"></i> FIND NEARBY FIELDS</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pitches.map((p, idx) => (
          <div key={idx} className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 group hover:border-sunYellow transition-all flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-sunNavy uppercase italic text-sm">{p.title}</h3>
                <i className="fas fa-map-pin text-sunYellow group-hover:scale-125 transition-transform"></i>
              </div>
              {p.snippet && (
                <p className="text-[10px] text-gray-500 font-medium italic mb-4 line-clamp-2">"{p.snippet}"</p>
              )}
            </div>
            <div className="flex items-center justify-between mt-4">
              <a 
                href={p.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[10px] font-black text-sunNavy hover:text-sunYellow transition-colors uppercase"
              >
                VIEW MAPS <i className="fas fa-external-link-alt"></i>
              </a>
              <button 
                disabled={addingId === p.uri}
                onClick={() => handleAdd(p)}
                className="bg-sunYellow text-sunNavy px-4 py-2 rounded-xl text-[10px] font-black hover:scale-105 transition-transform uppercase shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {addingId === p.uri ? (
                  <><i className="fas fa-spinner animate-spin"></i> SAVING...</>
                ) : (
                  <><i className="fas fa-plus"></i> ADD TO SYSTEM</>
                )}
              </button>
            </div>
          </div>
        ))}
        {!loading && pitches.length === 0 && (
          <div className="col-span-full py-10 text-center border-2 border-dashed border-gray-200 rounded-[2rem] bg-gray-50/50">
            <i className="fas fa-radar text-gray-200 text-3xl mb-3 block"></i>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Click discover to find official pitches in your area</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PitchDiscover;
