#ifndef _DEMO_H
#define _DEMO_H

#include <kk/kk.h>

namespace kk {

	typedef kk::Map<kk::Number,kk::String> PropertyMap;

	class IDemo:public kk::IObject {
	public:
		virtual kk::String title() = 0;
		virtual kk::Int version() = 0;
		virtual kk::Boolean output() = 0;
		virtual void setOutput(kk::Boolean v) = 0;
		virtual PropertyMap * propertys() = 0;
		virtual void setPropertys(PropertyMap * v) = 0;
		virtual kk::String (*ondone())(kk::String name) = 0;
		virtual void setOndone(kk::String ((*v)(kk::String name))) = 0;
		virtual kk::String exec(kk::String name) = 0;
	};

	class Demo:public kk::Object,public IDemo {
	private: 
		kk::String _title;

	private: 
		kk::Number _version;

	public: 
		virtual PropertyMap * propertys();
		virtual void setPropertys(PropertyMap * v);
	protected:
		kk::Strong<PropertyMap *> _propertys;

	public: 
		virtual kk::String title();
	public: 
		virtual kk::Int version();
	public: 
		virtual kk::Boolean output();
		virtual void setOutput(kk::Boolean v);
	protected:
		kk::Boolean _output;

	public: 
		virtual kk::String (*ondone())(kk::String name);
		virtual void setOndone(kk::String ((*v)(kk::String name)));
	protected:
		kk::Function<kk::String ((*)(kk::String name))> _ondone;

	public: 
		virtual kk::String exec(kk::String name);
	public: 
		virtual kk::String done(kk::String name);
	public:
		Demo(kk::String title,kk::Int version);

	};

	IDemo * createDemo(kk::String title,kk::Int version);

}

#endif

