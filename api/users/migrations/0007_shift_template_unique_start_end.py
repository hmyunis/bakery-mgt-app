from datetime import datetime, timedelta

from django.db import migrations, models


def _time_to_minutes(t):
    return t.hour * 60 + t.minute


def _minutes_to_time(minutes):
    minutes = minutes % (24 * 60)
    return (datetime.min + timedelta(minutes=minutes)).time()


def dedupe_shift_templates(apps, schema_editor):
    ShiftTemplate = apps.get_model("users", "ShiftTemplate")

    seen = set()
    for st in ShiftTemplate.objects.order_by("id"):
        key = (st.start_time, st.end_time)
        if key not in seen:
            seen.add(key)
            continue

        # Nudge end_time by 1 minute until it's unique.
        start_m = _time_to_minutes(st.start_time)
        end_m = _time_to_minutes(st.end_time)
        for i in range(1, 60 * 24 + 1):
            candidate = (st.start_time, _minutes_to_time(end_m + i))
            if candidate not in seen:
                st.end_time = candidate[1]
                st.save(update_fields=["end_time"])
                seen.add(candidate)
                break
        else:
            # Fallback: nudge start_time too (extremely unlikely)
            st.start_time = _minutes_to_time(start_m + 1)
            st.end_time = _minutes_to_time(end_m + 2)
            st.save(update_fields=["start_time", "end_time"])
            seen.add((st.start_time, st.end_time))


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0006_leave_type_misc_to_other"),
    ]

    operations = [
        migrations.RunPython(dedupe_shift_templates, reverse_code=migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="shifttemplate",
            constraint=models.UniqueConstraint(
                fields=("start_time", "end_time"),
                name="unique_shift_template_start_end_time",
            ),
        ),
    ]

