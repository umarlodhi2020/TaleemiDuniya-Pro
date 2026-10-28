import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import SchoolWebsiteView from "../../components/public/SchoolWebsiteView";

const SchoolWebsiteTemplate = () => {
  const { schoolSlug } = useParams();
  const [websiteData, setWebsiteData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebsite = async () => {
      try {
        const q = query(
          collection(db, "school_websites"),
          where("slug", "==", schoolSlug)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setWebsiteData(querySnapshot.docs[0].data());
        } else {
          setWebsiteData(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWebsite();
  }, [schoolSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
          <div className="absolute text-white font-bold tracking-widest text-xs mt-24 animate-pulse">LOADING</div>
        </div>
      </div>
    );
  }

  if (!websiteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-4 border border-white/10 p-8 rounded-3xl bg-white/5 backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-2xl font-black">
            🌐
          </div>
          <h1 className="text-2xl font-black">Website Under Setup</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The school portal website for this domain has not been published yet. If you are the school administrator, please configure and publish your website from the School Admin panel.
          </p>
        </div>
      </div>
    );
  }

  return <SchoolWebsiteView data={websiteData} />;
};

export default SchoolWebsiteTemplate;
