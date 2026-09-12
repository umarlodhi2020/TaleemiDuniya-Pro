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

  // Fallback dummy data if no website data is found
  const data = websiteData || {
    name: "TaleemiDunya Model School",
    tagline: "Excellence in Education",
    about:
      "We provide world-class education focusing on academic excellence, character building, and future-ready skills. Join us in shaping the leaders of tomorrow.",
    logo: "",
    banner: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070",
    themeColor: "#4f46e5",
    phone: "+92 300 1234567",
    email: "info@school.com",
    address: "123 Education Street, Knowledge City",
    events: [
      {
        title: "Annual Sports Day",
        date: "2026-10-15",
        desc: "A day full of athletic events.",
        type: "photo",
        url: "https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=600",
      },
      {
        title: "Science Exhibition",
        date: "2026-11-20",
        desc: "Innovative projects by our brilliant students.",
        type: "photo",
        url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=600",
      },
    ],
  };

  return <SchoolWebsiteView data={data} />;
};

export default SchoolWebsiteTemplate;
