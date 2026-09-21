import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { setAuthUser } from "@/redux/authSlice";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const EditProfile = () => {
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const imageRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(user?.profilePicture || "");
  const [input, setInput] = useState({
    username: user?.username || "",
    fullName: user?.fullName || "",
    bio: user?.bio || "",
    gender: user?.gender || "",
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
    website: user?.website || "",
    profilePhoto: null,
  });

  /* ---------- LOGIC (UNCHANGED) ---------- */
  useEffect(() => {
    setInput({
      username: user?.username || "",
      fullName: user?.fullName || "",
      bio: user?.bio || "",
      gender: user?.gender || "",
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
      website: user?.website || "",
      profilePhoto: null,
    });
    setPhotoPreview(user?.profilePicture || "");
  }, [user]);

  const changeHandler = (event) => {
    setInput((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const fileChangeHandler = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photo must be smaller than 5 MB.");
      return;
    }
    setInput((current) => ({ ...current, profilePhoto: file }));
    setPhotoPreview(URL.createObjectURL(file));
  };

  const editProfileHandler = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("username", input.username);
    formData.append("fullName", input.fullName);
    formData.append("bio", input.bio);
    formData.append("gender", input.gender);
    formData.append("dateOfBirth", input.dateOfBirth);
    formData.append("website", input.website);
    if (input.profilePhoto) formData.append("profilePhoto", input.profilePhoto);

    try {
      setLoading(true);
      const res = await axios.post(
        apiUrl("/api/v1/user/profile/edit"),
        formData,
        { withCredentials: true },
      );
      if (res.data.success) {
        dispatch(setAuthUser({ ...user, ...res.data.user }));
        toast.success(res.data.message || "Profile updated successfully.");
        navigate(`/profile/${user?._id}`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update your profile."));
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-10 animate-fade-in">
      {/* BACK */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white/90 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </button>

      {/* FORM CARD */}
      <form
        onSubmit={editProfileHandler}
        className="glass rounded-[32px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
      >
        {/* HEADER */}
        <div className="relative px-6 py-8 md:px-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/25 via-fuchsia-500/15 to-cyan-500/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a18]/60" />

          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">
              Your identity
            </p>
            <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold">
              <span className="text-gradient">Edit profile</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/55">
              Shape the details people see when they find you.
            </p>
          </div>
        </div>

        <div className="p-6 md:p-10 space-y-8">
          {/* PHOTO SECTION */}
          <div className="flex flex-col items-center gap-5 sm:flex-row rounded-3xl bg-white/[0.03] border border-white/8 p-5">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-80 animate-glow-pulse" />
              <Avatar className="relative h-24 w-24 ring-4 ring-[#0a0a18]">
                <AvatarImage src={photoPreview} alt={user?.username} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-semibold">
                  {user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-display text-lg font-bold text-white">
                @{user?.username}
              </h2>
              <p className="mt-1 text-xs text-white/45">
                JPG, PNG or WEBP — maximum 5 MB
              </p>
            </div>

            <input
              ref={imageRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={fileChangeHandler}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full bg-white/8 border border-white/10 text-white/90 hover:bg-white/12 hover:border-white/20 transition-all duration-200 active:scale-95"
            >
              <Camera className="h-3.5 w-3.5" />
              Change photo
            </button>
          </div>

          {/* ABOUT YOU */}
          <section className="space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                About you
              </h2>
              <p className="text-sm text-white/45 mt-0.5">
                A few details help your profile feel more personal.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-white/70 text-xs font-medium"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  value={input.username}
                  onChange={changeHandler}
                  placeholder="Your username"
                  minLength={3}
                  maxLength={30}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20 rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="fullName"
                  className="text-white/70 text-xs font-medium"
                >
                  Full name
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={input.fullName}
                  onChange={changeHandler}
                  placeholder="Your full name"
                  maxLength={80}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20 rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="website"
                  className="text-white/70 text-xs font-medium"
                >
                  Website
                </Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  value={input.website}
                  onChange={changeHandler}
                  placeholder="https://your-site.com"
                  maxLength={120}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20 rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="dateOfBirth"
                  className="text-white/70 text-xs font-medium"
                >
                  Date of birth
                </Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={input.dateOfBirth}
                  onChange={changeHandler}
                  max={new Date().toISOString().slice(0, 10)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20 rounded-xl h-11 [color-scheme:dark]"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-white/70 text-xs font-medium">
                  Gender
                </Label>
                <Select
                  value={input.gender}
                  onValueChange={(gender) =>
                    setInput((current) => ({ ...current, gender }))
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:ring-violet-400/20">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="glass-strong !rounded-2xl !border-white/10">
                    <SelectItem
                      value="male"
                      className="text-white focus:bg-white/10"
                    >
                      Male
                    </SelectItem>
                    <SelectItem
                      value="female"
                      className="text-white focus:bg-white/10"
                    >
                      Female
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="bio"
                  className="text-white/70 text-xs font-medium"
                >
                  Bio
                </Label>
                <span className="text-[11px] text-white/35 tabular-nums">
                  {input.bio.length}/300
                </span>
              </div>
              <Textarea
                id="bio"
                name="bio"
                value={input.bio}
                onChange={changeHandler}
                placeholder="Tell people a little about yourself"
                maxLength={300}
                className="min-h-32 resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20 rounded-lg"
              />
            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-3 border-t border-white/8 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-xs font-semibold px-5 py-2.5 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(124,92,255,0.4)] hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-36"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
};

export default EditProfile;
