import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfilePictureUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  onAvatarUpdate: (newAvatarUrl: string) => void;
}

export function ProfilePictureUpload({ userId, currentAvatarUrl, onAvatarUpdate }: ProfilePictureUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPEG, PNG, WebP, or GIF).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (1MB limit)
    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 1MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, selectedFile, {
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Success!
      onAvatarUpdate(publicUrl);
      setIsOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been successfully updated.",
      });

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      // Update user profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Delete old file from storage if it exists
      if (currentAvatarUrl) {
        const fileName = currentAvatarUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('profile-pictures')
            .remove([`${userId}/${fileName}`]);
        }
      }

      onAvatarUpdate('');
      setIsOpen(false);
      
      toast({
        title: "Profile Picture Removed",
        description: "Your profile picture has been removed.",
      });

    } catch (error) {
      console.error('Error removing profile picture:', error);
      toast({
        title: "Remove Failed",
        description: "There was an error removing your profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative group/upload px-3 py-2 bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary/90 hover:to-accent/90 border border-primary/50 text-white font-semibold transition-all duration-300 backdrop-blur-sm"
          style={{
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
          }}
        >
          {/* Glowing background effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-accent/40 blur-sm opacity-0 group-hover/upload:opacity-100 transition-opacity duration-300" />
          
          {/* Button content */}
          <div className="relative flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span className="text-sm">
              {currentAvatarUrl ? 'Change Picture' : 'Add Picture'}
            </span>
          </div>
          
          {/* Scan line effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover/upload:translate-x-[100%] transition-transform duration-700 ease-out" />
          
          {/* Tech corners */}
          <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-primary/60" />
          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-primary/60" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md border-0 bg-transparent">
        <div className="relative h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl rounded-2xl border border-white/10" />
          
          <div className="relative p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Update Profile Picture
              </DialogTitle>
              <DialogDescription>
                Upload a new profile picture or remove your current one.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Current/Preview Avatar */}
              <div className="flex justify-center">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-primary/50">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : currentAvatarUrl ? (
                    <img src={currentAvatarUrl} alt="Current avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* File Input */}
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select Image
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Supported formats: JPEG, PNG, WebP, GIF (max 1MB)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {selectedFile && (
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                )}

                {currentAvatarUrl && !selectedFile && (
                  <Button
                    onClick={handleRemove}
                    disabled={uploading}
                    variant="destructive"
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}