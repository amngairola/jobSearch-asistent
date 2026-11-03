import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, Code, FolderOpen,
  Award, CheckCircle2, Edit3, Save, X, Plus, Trash2
} from 'lucide-react';
import type { ParsedResume, ExperienceItem, EducationItem, ProjectItem } from '../lib/api';

interface ResumeViewerProps {
  resume: ParsedResume;
  filename?: string | null;
  onSave?: (updated: ParsedResume) => Promise<void> | void;
}

export const ResumeViewer: React.FC<ResumeViewerProps> = ({ resume, filename, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state initialized from resume
  const [formData, setFormData] = useState<ParsedResume>(() => JSON.parse(JSON.stringify(resume)));
  const [skillsText, setSkillsText] = useState((resume.skills || []).join(', '));
  const [certsText, setCertsText] = useState((resume.certifications || []).join(', '));

  // Reset form when resume changes
  React.useEffect(() => {
    setFormData(JSON.parse(JSON.stringify(resume)));
    setSkillsText((resume.skills || []).join(', '));
    setCertsText((resume.certifications || []).join(', '));
  }, [resume]);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      // Parse skills from comma-separated text
      const cleanSkills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
      const cleanCerts = certsText.split(',').map(s => s.trim()).filter(Boolean);

      const payload: ParsedResume = {
        ...formData,
        skills: cleanSkills,
        certifications: cleanCerts
      };

      await onSave(payload);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save resume profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [
        ...(prev.experience || []),
        { company: '', role: '', duration: '', description: '', achievements: [] }
      ]
    }));
  };

  const removeExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experience: (prev.experience || []).filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...(prev.education || []),
        { degree: '', institution: '', dates: '', cgpa: '' }
      ]
    }));
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index)
    }));
  };

  const addProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [
        ...(prev.projects || []),
        { name: '', technologies: [], description: '' }
      ]
    }));
  };

  const removeProject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      projects: (prev.projects || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6 text-sm">
      {/* Top Header / Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
        <div>
          <span className="text-xs text-gray-500 font-medium">Source Document:</span>
          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate max-w-sm">
            {filename || `${resume.name || 'Resume'}.pdf`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onSave && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Review & Edit Profile
            </button>
          )}

          {isEditing && (
            <>
              <button
                onClick={() => {
                  setFormData(JSON.parse(JSON.stringify(resume)));
                  setSkillsText((resume.skills || []).join(', '));
                  setCertsText((resume.certifications || []).join(', '));
                  setIsEditing(false);
                }}
                disabled={saving}
                className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save & Re-match'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* VIEW MODE */}
      {!isEditing ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Personal Information */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-6 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-xl">{resume.name}</h2>
                {resume.designation && (
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold mt-1">
                    {resume.designation}
                  </p>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Extracted Profile
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-blue-100/80 dark:border-blue-900/40 text-xs text-gray-600 dark:text-gray-300">
              {resume.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{resume.email}</span>
                </div>
              )}
              {resume.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{resume.phone}</span>
                </div>
              )}
              {resume.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{resume.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Technical Skills: Grouped & Flat */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                <Code className="w-4 h-4 text-blue-600" />
                Technical Skills ({resume.skills?.length || 0})
              </div>
            </div>

            {/* If categorized skills exist, show them in distinct sections */}
            {resume.skillsByCategory && Object.keys(resume.skillsByCategory).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {Object.entries(resume.skillsByCategory).map(([cat, skList]) => {
                  if (!Array.isArray(skList) || skList.length === 0) return null;
                  const labelMap: Record<string, string> = {
                    languages: 'Languages',
                    frameworks: 'Frameworks & Libraries',
                    developerTools: 'Developer Tools & Cloud',
                    librariesAndDatabases: 'Databases & Storage',
                    other: 'Other Technologies'
                  };
                  return (
                    <div key={cat} className="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {labelMap[cat] || cat}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {skList.map((s, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 text-xs px-2.5 py-0.5 rounded-md font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(resume.skills || []).map((skill, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 text-xs px-2.5 py-1 rounded-lg font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Work Experience */}
          {resume.experience && resume.experience.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 mb-4">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                Work Experience
              </div>
              <div className="space-y-4">
                {resume.experience.map((exp, i) => (
                  <div key={i} className="border-l-2 border-emerald-400 pl-4 py-0.5">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{exp.role}</div>
                    <div className="text-gray-500 text-xs mt-0.5 font-medium">
                      {exp.company} {exp.duration ? `• ${exp.duration}` : ''}
                    </div>
                    {exp.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                        {exp.description}
                      </p>
                    )}
                    {exp.achievements && exp.achievements.length > 0 && (
                      <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-gray-600 dark:text-gray-400">
                        {exp.achievements.map((ach, idx) => (
                          <li key={idx} className="leading-relaxed">{ach}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {resume.education && resume.education.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 mb-3">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                Education
              </div>
              <div className="space-y-3">
                {resume.education.map((edu, i) => (
                  <div key={i} className="border-l-2 border-purple-400 pl-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white text-xs">{edu.degree}</span>
                      {edu.cgpa && (
                        <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-200/50">
                          CGPA: {edu.cgpa}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {edu.institution} {edu.dates || edu.year ? `• ${edu.dates || edu.year}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {resume.projects && resume.projects.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 mb-3">
                <FolderOpen className="w-4 h-4 text-amber-600" />
                Projects
              </div>
              <div className="space-y-3">
                {resume.projects.map((proj, i) => (
                  <div key={i} className="border-l-2 border-amber-400 pl-4">
                    <div className="font-semibold text-gray-900 dark:text-white text-xs">{proj.name}</div>
                    {proj.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{proj.description}</p>
                    )}
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {proj.technologies.map((t, idx) => (
                          <span key={idx} className="text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-200/50">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {resume.certifications && resume.certifications.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 mb-3">
                <Award className="w-4 h-4 text-indigo-600" />
                Certifications
              </div>
              <div className="flex flex-wrap gap-1.5">
                {resume.certifications.map((cert, idx) => (
                  <span key={idx} className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-200/50 font-medium">
                    {typeof cert === 'string' ? cert : JSON.stringify(cert)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        /* EDIT MODE FORM */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Edit Extracted Profile</h3>
            <p className="text-xs text-gray-500">Correct any misrecognized fields below. Changes will be saved and used for future job matches.</p>
          </div>

          {/* Personal Information Inputs */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider">Personal Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Professional Title</label>
                <input
                  type="text"
                  value={formData.designation || ''}
                  onChange={e => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Technical Skills Inputs */}
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider">Technical Skills (comma-separated)</h4>
            <textarea
              rows={3}
              value={skillsText}
              onChange={e => setSkillsText(e.target.value)}
              placeholder="e.g. React, TypeScript, Node.js, Python, Docker"
              className="w-full text-xs p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 outline-none leading-relaxed"
            />
          </div>

          {/* Work Experience Inputs */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider">Work Experience</h4>
              <button
                type="button"
                onClick={addExperience}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Role
              </button>
            </div>
            {(formData.experience || []).map((exp, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Position #{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeExperience(i)}
                    className="text-red-500 hover:text-red-700 text-xs p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500">Role / Title</label>
                    <input
                      type="text"
                      value={exp.role || ''}
                      onChange={e => {
                        const copy = [...(formData.experience || [])];
                        copy[i].role = e.target.value;
                        setFormData({ ...formData, experience: copy });
                      }}
                      className="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Company</label>
                    <input
                      type="text"
                      value={exp.company || ''}
                      onChange={e => {
                        const copy = [...(formData.experience || [])];
                        copy[i].company = e.target.value;
                        setFormData({ ...formData, experience: copy });
                      }}
                      className="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Duration</label>
                    <input
                      type="text"
                      value={exp.duration || ''}
                      onChange={e => {
                        const copy = [...(formData.experience || [])];
                        copy[i].duration = e.target.value;
                        setFormData({ ...formData, experience: copy });
                      }}
                      className="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Description / Achievements</label>
                  <textarea
                    rows={2}
                    value={exp.description || ''}
                    onChange={e => {
                      const copy = [...(formData.experience || [])];
                      copy[i].description = e.target.value;
                      setFormData({ ...formData, experience: copy });
                    }}
                    className="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Education Inputs */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider">Education</h4>
              <button
                type="button"
                onClick={addEducation}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Degree
              </button>
            </div>
            {(formData.education || []).map((edu, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Degree #{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeEducation(i)}
                    className="text-red-500 hover:text-red-700 text-xs p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-gray-500">Degree</label>
                    <input
                      type="text"
                      value={edu.degree || ''}
                      onChange={e => {
                        const copy = [...(formData.education || [])];
                        copy[i].degree = e.target.value;
                        setFormData({ ...formData, education: copy });
                      }}
                      className="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Institution</label>
                    <input
                      type="text"
                      value={edu.institution || ''}
                      onChange={e => {
                        const copy = [...(formData.education || [])];
                        copy[i].institution = e.target.value;
                        setFormData({ ...formData, education: copy });
                      }}
                      className="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">CGPA / Dates</label>
                    <input
                      type="text"
                      value={edu.cgpa || edu.dates || edu.year || ''}
                      onChange={e => {
                        const copy = [...(formData.education || [])];
                        copy[i].cgpa = e.target.value;
                        setFormData({ ...formData, education: copy });
                      }}
                      className="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Certifications Inputs */}
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider">Certifications (comma-separated)</h4>
            <input
              type="text"
              value={certsText}
              onChange={e => setCertsText(e.target.value)}
              placeholder="e.g. AWS Certified Solutions Architect, Certified React Developer"
              className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 outline-none"
            />
          </div>

          {/* Save Bar */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save & Re-match Jobs'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
