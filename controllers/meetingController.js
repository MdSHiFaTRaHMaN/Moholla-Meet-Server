const Meeting = require('../models/Meeting');

exports.getMeetings = async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const query = workspaceId
      ? { workspace: workspaceId, $or: [{ host: req.user.id }, { attendees: req.user.id }] }
      : { $or: [{ host: req.user.id }, { attendees: req.user.id }] };

    const meetings = await Meeting.find(query)
      .populate('host', 'name avatar')
      .populate('attendees', 'name avatar')
      .sort({ scheduledAt: 1 });

    res.json({ success: true, meetings });
  } catch (err) {
    console.error('[Meeting] GetMeetings error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch meetings.' });
  }
};

exports.createMeeting = async (req, res) => {
  try {
    const { workspaceId, title, scheduledAt, durationMinutes, attendeeIds } = req.body;

    if (!title || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'Title and scheduled date are required.' });
    }

    const roomName = `CollabSpace-${title.replace(/\s+/g, '-').substring(0, 30)}-${Date.now()}`;

    const meeting = await Meeting.create({
      workspace: workspaceId,
      title: title.trim(),
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes || 30,
      host: req.user.id,
      attendees: attendeeIds ? [...new Set([req.user.id, ...attendeeIds])] : [req.user.id],
      roomUrl: `https://meet.jit.si/${roomName}`,
      status: 'Scheduled'
    });

    await meeting.populate('host', 'name avatar');
    await meeting.populate('attendees', 'name avatar');

    res.status(201).json({ success: true, meeting });
  } catch (err) {
    console.error('[Meeting] CreateMeeting error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create meeting.' });
  }
};

exports.updateMeetingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('host', 'name avatar').populate('attendees', 'name avatar');

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });
    res.json({ success: true, meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update meeting.' });
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    await Meeting.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Meeting deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete meeting.' });
  }
};
