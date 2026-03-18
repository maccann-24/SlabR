"use client";

import { useState } from "react";
import { INDUSTRY_TEMPLATES, INDUSTRY_KEYS, type IndustryKey } from "@serviceline/templates";

export default function IndustryServiceSelector() {
  const [industry, setIndustry] = useState<IndustryKey>("plumbing");
  const template = INDUSTRY_TEMPLATES[industry];

  return (
    <>
      {/* Industry Selection */}
      <fieldset>
        <legend className="block text-sm font-medium text-slate-300 mb-3">
          Industry <span className="text-red-400">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INDUSTRY_KEYS.map((key: IndustryKey) => {
            const t = INDUSTRY_TEMPLATES[key];
            const selected = industry === key;
            return (
              <label
                key={key}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                  selected
                    ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20"
                    : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="industry"
                  value={key}
                  checked={selected}
                  onChange={() => setIndustry(key)}
                  className="sr-only"
                />
                <span className="text-xl">{t.icon}</span>
                <div>
                  <p className={`text-sm font-medium ${selected ? "text-white" : "text-slate-300"}`}>
                    {t.name}
                  </p>
                  <p className="text-xs text-slate-500">{t.tagline}</p>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Services — dynamic based on industry */}
      <fieldset>
        <legend className="block text-sm font-medium text-slate-300">
          Services
        </legend>
        <p className="text-xs text-slate-500 mt-0.5 mb-2">
          Select the services this client offers
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {template.services.map((service: string, i: number) => (
            <label
              key={`${industry}-${service}`}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/30 px-3 py-2 text-sm text-slate-300 hover:border-slate-600 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                name={`service_${service}`}
                defaultChecked={i < 3}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              {service}
            </label>
          ))}
        </div>
      </fieldset>

      {/* AI System Prompt — optional override */}
      <div>
        <label
          htmlFor="aiSystemPrompt"
          className="block text-sm font-medium text-slate-300"
        >
          Custom AI Instructions
          <span className="text-slate-500 font-normal"> — optional</span>
        </label>
        <p className="text-xs text-slate-500 mt-0.5 mb-2">
          Additional instructions for the AI phone agent beyond the {template.name} defaults
        </p>
        <textarea
          id="aiSystemPrompt"
          name="aiSystemPrompt"
          rows={3}
          placeholder={`e.g., "We specialize in commercial ${template.name.toLowerCase()}. Always ask if the caller is a homeowner or business."`}
          className="block w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        />
      </div>
    </>
  );
}
